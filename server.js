const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

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

// Helpful fallback for unknown routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.warn("MongoDB not connected: add MONGODB_URI to your .env file to enable signup/login.");
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.warn("Starting server without MongoDB. Pages will load, but signup/login will not work until the database connects.");
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
}

startServer();
