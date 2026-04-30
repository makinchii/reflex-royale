const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { requireAuth } = require("../lib/sessionAuth");

const router = express.Router();

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

router.get("/", async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected yet.",
      leaderboard: [],
    });
  }

  try {
    const leaderboard = await User.aggregate([
      {
        $project: {
          username: 1,
          bestScore: { $ifNull: ["$bestScore", 0] },
          hasScore: {
            $cond: [
              { $gt: [{ $ifNull: ["$bestScore", 0] }, 0] },
              0,
              1,
            ],
          },
        },
      },
      {
        $sort: {
          hasScore: 1,
          bestScore: 1,
          username: 1,
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          username: 1,
          bestScore: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not load the leaderboard.",
      leaderboard: [],
    });
  }
});

router.post("/update-score", requireAuth, async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected yet.",
    });
  }

  const reactionTime = Number(req.body?.reactionTime);
  if (!Number.isFinite(reactionTime) || reactionTime <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid reaction time is required.",
    });
  }

  try {
    const user = req.currentUser;
    const currentBest = Number(user.bestScore || 0);
    let updated = false;

    if (currentBest === 0 || reactionTime < currentBest) {
      user.bestScore = Math.round(reactionTime);
      await user.save();
      updated = true;
    }

    return res.json({
      success: true,
      username: user.username,
      bestScore: user.bestScore || 0,
      updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not update the leaderboard score.",
    });
  }
});

module.exports = router;
