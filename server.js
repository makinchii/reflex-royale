const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const MongoStore = require("connect-mongo");

dotenv.config();

let authRoutes;
try {
  authRoutes = require("./routes/auth");
} catch (err) {
  console.warn("Auth routes unavailable (bcrypt issue). Signup/login disabled.");
  authRoutes = require("express").Router(); // empty fallback
}
const { initGameSockets } = require("./sockets/gameRoom");
const leaderboardRoutes = require("./routes/leaderboard");
const audioRoutes = require("./routes/audio");

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "reflex-royale-dev-secret";

// Disable Mongoose command buffering so DB problems fail clearly.
mongoose.set("bufferCommands", false);

function isMongoConnectionError(error) {
  return Boolean(
    error &&
      (error.name === "MongoServerError" || error.name === "MongoNetworkError") &&
      (error.code === 8000 || error.errorLabelSet?.has?.("HandshakeError") || /authentication failed|bad auth/i.test(error.message || ""))
  );
}

process.on("unhandledRejection", (reason) => {
  if (isMongoConnectionError(reason)) {
    console.error("MongoDB background connection error:", reason.message);
    return;
  }

  throw reason;
});

function createApp(options = {}) {
  const useSessionStore = options.useSessionStore !== false;
  const mongoSessionStore = options.sessionStore;
  const useNextFrontend = options.useNextFrontend === true;
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  let nextRequestHandler = null;

  app.setNextRequestHandler = (handler) => {
    nextRequestHandler = handler;
  };

  function nextProxy(req, res, nextFn) {
    if (nextRequestHandler) {
      return nextRequestHandler(req, res).catch(nextFn);
    }

    return nextFn();
  }

  if (isProduction || process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  // Parse JSON requests and standard HTML form submissions.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: useSessionStore ? mongoSessionStore : undefined,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction
      }
    })
  );

  // Serve static assets such as CSS and client-side JavaScript.
  app.use(express.static(path.join(__dirname, "public")));

  // Auth API routes are kept in their own file for easier future expansion.
  app.use("/api/auth", authRoutes);
  app.use("/api/audio", audioRoutes);
  app.use("/leaderboard", leaderboardRoutes);

  // Serve the new Next frontend when enabled, otherwise keep the legacy landing page.
  if (useNextFrontend) {
    app.get("/", nextProxy);
    app.get("/signup", nextProxy);
    app.get("/login", nextProxy);
    app.get("/dashboard", nextProxy);
    app.get("/navigate", nextProxy);
    app.get("/local", nextProxy);
    app.get("/online", nextProxy);
    app.get("/ui-lab", nextProxy);
  } else {
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "index.html"));
    });

    app.get("/signup", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "signup.html"));
    });

    app.get("/login", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "login.html"));
    });

    app.get("/dashboard", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "dashboard.html"));
    });

    app.get("/navigate", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "index.html"));
    });

    app.get("/leaderboard-page", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "leaderboard.html"));
    });

    // ── Game routes ──
    app.get("/local", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "game-local.html"));
    });

    app.get("/online", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "game-remote.html"));
    });
  }

  app.get("/api/auth/session", (req, res) => {
    if (!req.session?.user) {
      return res.json({ authenticated: false, user: null });
    }

    return res.json({ authenticated: true, user: req.session.user });
  });

  if (useNextFrontend) {
    // Let Next see the full URL so asset paths like /_next/static stay intact.
    app.use(nextProxy);
  }

  // Helpful fallback for unknown routes.
  app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found." });
  });

  return app;
}

function createServer(options = {}) {
  const app = createApp(options);
  const server = http.createServer(app);
  const io = new Server(server);

  // Initialise Socket.IO game rooms for separate-device mode
  initGameSockets(io);

  return { app, server, io };
}

function registerShutdownHandlers({ server, io, nextApp }) {
  let shuttingDown = false;

  async function shutdown(signal, restart = false) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    io.close();

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    if (nextApp?.close) {
      await nextApp.close();
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    if (restart) {
      process.kill(process.pid, signal);
    }
  }

  process.once("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error("Shutdown error:", error.message);
    });
  });

  process.once("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error("Shutdown error:", error.message);
    });
  });

  process.once("SIGUSR2", () => {
    shutdown("SIGUSR2", true).catch((error) => {
      console.error("Shutdown error:", error.message);
      process.kill(process.pid, "SIGUSR2");
    });
  });
}

async function startServer() {
  const useNextFrontend = process.env.NEXT_FRONTEND !== "false";
  let sessionStore = null;

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions"
      });
      console.log("MongoDB connected successfully.");
    } catch (error) {
      console.error("MongoDB connection error:", error.message);
      console.warn("Starting server without MongoDB. Pages will load, but signup/login will not work until the database connects.");
      await mongoose.disconnect().catch(() => {});
    }
  } else {
    console.warn("MongoDB not connected: add MONGODB_URI to your .env file to enable signup/login.");
  }

  const { app, server, io } = createServer({ useNextFrontend, sessionStore });
  let nextApp = null;

  registerShutdownHandlers({ server, io, nextApp });

  if (useNextFrontend) {
    const buildIdPath = path.join(__dirname, ".next", "BUILD_ID");
    if (process.env.NODE_ENV === "production" && !fs.existsSync(buildIdPath)) {
      console.error("Missing Next production build. Run `npm run build` before `npm start`, or set Render Start Command to `npm run render-start`.");
      process.exitCode = 1;
      return;
    }

    nextApp = next({
      dev: process.env.NODE_ENV !== "production",
      dir: __dirname,
      webpack: true
    });

    await nextApp.prepare();
    app.setNextRequestHandler(nextApp.getRequestHandler());
  }

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, createServer, startServer };
