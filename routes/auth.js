const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");
const { createSession, destroySession, getCurrentUser } = require("../lib/sessionAuth");
const { THEME_COMMAND_COLORS, isAllowedThemeColor, normalizeThemeShades } = require("../lib/themePreferences");

const router = express.Router();
const SALT_ROUNDS = 10;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const THEME_COMMANDS = new Set(Object.keys(THEME_COMMAND_COLORS));
const THEME_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim() : "";
}

function validateCredentials(username, password) {
  if (!username || !password) {
    return "Username and password are required.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-20 characters and use only letters, numbers, underscores, or hyphens.";
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

function serializeUser(user) {
  const preferredThemeShades = normalizeThemeShades(user.preferredThemeShades);
  return {
    username: user.username,
    bestScore: user.bestScore || 0,
    preferredThemeCommand: user.preferredThemeCommand || "tron",
    preferredThemeColor: user.preferredThemeColor || "#00d4ff",
    preferredThemeShades,
  };
}

router.post("/signup", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;
  const validationError = validateCredentials(username, password);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected yet. Add your MONGODB_URI to the .env file and restart the server."
    });
  }

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "That username is already taken."
      });
    }

    // Hash the password before saving so plain text is never stored.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return res.status(500).json({
          success: false,
          message: "Could not create session. Please try again."
        });
      }

      createSession(req, res, newUser);

      return res.status(201).json({
        success: true,
        message: "Signup successful.",
        user: serializeUser(newUser),
        redirectTo: "/dashboard"
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not create account. Please try again."
    });
  }
});

router.post("/login", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required."
    });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected yet. Add your MONGODB_URI to the .env file and restart the server."
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password."
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return res.status(500).json({
          success: false,
          message: "Could not create session. Please try again."
        });
      }

      createSession(req, res, user);

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        user: serializeUser(user),
        redirectTo: "/dashboard"
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not log in. Please try again."
    });
  }
});

router.post("/logout", (req, res) => {
  destroySession(req, res, () => {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

router.get("/me", async (req, res) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Not logged in.",
    });
  }

  return res.status(200).json({
    success: true,
    user: serializeUser(user),
  });
});

router.post("/theme", async (req, res) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Not logged in.",
    });
  }

  const preferredThemeCommand = typeof req.body.preferredThemeCommand === "string" ? req.body.preferredThemeCommand : "";
  const preferredThemeColor = typeof req.body.preferredThemeColor === "string" ? req.body.preferredThemeColor : "";
  const preferredThemeShades = normalizeThemeShades(req.body.preferredThemeShades);

  if (!THEME_COMMANDS.has(preferredThemeCommand) || !THEME_COLOR_PATTERN.test(preferredThemeColor) || !isAllowedThemeColor(preferredThemeCommand, preferredThemeColor)) {
    return res.status(400).json({
      success: false,
      message: "Invalid theme preference.",
    });
  }

  user.preferredThemeCommand = preferredThemeCommand;
  user.preferredThemeColor = preferredThemeColor;
  user.preferredThemeShades = preferredThemeShades;
  await user.save();
  createSession(req, res, user);

  return res.status(200).json({
    success: true,
    user: serializeUser(user),
  });
});

module.exports = router;
