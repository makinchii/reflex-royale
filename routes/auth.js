const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();
const SALT_ROUNDS = 10;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

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

      req.session.user = {
        id: newUser._id.toString(),
        username: newUser.username
      };

      return res.status(201).json({
        success: true,
        message: "Signup successful.",
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
  const { username, password } = req.body;

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

      req.session.user = {
        id: user._id.toString(),
        username: user.username
      };

      return res.status(200).json({
        success: true,
        message: "Login successful.",
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
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Could not log out. Please try again."
      });
    }

    res.clearCookie("connect.sid");
    return res.json({ success: true, message: "Logged out." });
  });
});

module.exports = router;
