const path = require("path");
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

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "reflex-royale-dev-secret";

// Disable Mongoose command buffering so DB problems fail clearly.
mongoose.set("bufferCommands", false);

function createApp(options = {}) {
  const useSessionStore = options.useSessionStore !== false;
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
      store: useSessionStore && MONGODB_URI
        ? MongoStore.create({
            mongoUrl: MONGODB_URI,
            collectionName: "sessions"
          })
        : undefined,
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
  app.use("/leaderboard", leaderboardRoutes);

  // Serve the new Next frontend when enabled, otherwise keep the legacy landing page.
  if (useNextFrontend) {
    app.get("/", nextProxy);
    app.get("/signup", nextProxy);
    app.get("/login", nextProxy);
    app.get("/dashboard", nextProxy);
    app.get("/play", nextProxy);
    app.get("/play/online", nextProxy);
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

    app.get("/leaderboard-page", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "leaderboard.html"));
    });

    // ── Game routes ──
    app.get("/play", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "game-local.html"));
    });

    app.get("/play/online", (req, res) => {
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
  const { app, server, io } = createServer({ useNextFrontend });
  let nextApp = null;

  registerShutdownHandlers({ server, io, nextApp });

  if (useNextFrontend) {
    nextApp = next({
      dev: process.env.NODE_ENV !== "production",
      dir: __dirname,
      webpack: true
    });

    await nextApp.prepare();
    app.setNextRequestHandler(nextApp.getRequestHandler());
  }

  if (!MONGODB_URI) {
    console.warn("MongoDB not connected: add MONGODB_URI to your .env file to enable signup/login.");
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully.");

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.warn("Starting server without MongoDB. Pages will load, but signup/login will not work until the database connects.");
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, createServer, startServer };
