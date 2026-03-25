const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

let authRoutes;
try {
  authRoutes = require("./routes/auth");
} catch (err) {
  console.warn("Auth routes unavailable (bcrypt issue). Signup/login disabled.");
  authRoutes = require("express").Router(); // empty fallback
}
const { initGameSockets } = require("./sockets/gameRoom");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Initialise Socket.IO game rooms for separate-device mode
initGameSockets(io);

// Disable Mongoose command buffering so DB problems fail clearly.
mongoose.set("bufferCommands", false);

// Parse JSON requests and standard HTML form submissions.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets such as CSS and client-side JavaScript.
app.use(express.static(path.join(__dirname, "public")));

// Auth API routes are kept in their own file for easier future expansion.
app.use("/api/auth", authRoutes);

// Serve simple HTML pages from the views folder.
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

// ── Game routes ──
app.get("/play", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "game-local.html"));
});

app.get("/play/online", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "game-remote.html"));
});

// Helpful fallback for unknown routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

async function startServer() {
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

startServer();
