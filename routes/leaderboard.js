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

router.post("/record-match", requireAuth, async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected yet.",
    });
  }

  const mode = String(req.body?.mode || "").trim();
  const place = Math.round(Number(req.body?.place));
  const averageReactionTime = Math.round(Number(req.body?.averageReactionTime));
  const falseStarts = Math.max(0, Math.round(Number(req.body?.falseStarts || 0)));
  const matchDurationSeconds = Math.max(0, Math.round(Number(req.body?.matchDurationSeconds || 0)));
  const reactions = Math.max(0, Math.round(Number(req.body?.reactions || 0)));
  const totalReactionTime = Math.max(0, Math.round(Number(req.body?.totalReactionTime || 0)));

  if (mode !== "online") {
    return res.status(400).json({
      success: false,
      message: "Only online matches can be recorded.",
    });
  }

  if (!Number.isFinite(place) || place < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid placement is required.",
    });
  }

  if (!Number.isFinite(averageReactionTime) || averageReactionTime <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid average reaction time is required.",
    });
  }

  try {
    const user = req.currentUser;
    const match = {
      mode,
      place,
      averageReactionTime,
      playedAt: new Date(),
    };

    user.recentMatches = [match, ...(user.recentMatches || [])].slice(0, 5);
    user.gamesPlayed = Number(user.gamesPlayed || 0) + 1;
    user.wins = Number(user.wins || 0) + (place === 1 ? 1 : 0);
    user.currentWinStreak = place === 1 ? Number(user.currentWinStreak || 0) + 1 : 0;
    user.bestWinStreak = Math.max(Number(user.bestWinStreak || 0), user.currentWinStreak);
    user.falseStarts = Number(user.falseStarts || 0) + falseStarts;
    user.reactions = Number(user.reactions || 0) + reactions;
    user.totalReactionTime = Number(user.totalReactionTime || 0) + (totalReactionTime || averageReactionTime * reactions);
    user.timeSpentPlayingSeconds = Number(user.timeSpentPlayingSeconds || 0) + matchDurationSeconds;
    await user.save();

    return res.json({
      success: true,
      stats: {
        falseStarts: user.falseStarts || 0,
        bestWinStreak: user.bestWinStreak || 0,
        currentWinStreak: user.currentWinStreak || 0,
        gamesPlayed: user.gamesPlayed || 0,
        reactions: user.reactions || 0,
        timeSpentPlayingSeconds: user.timeSpentPlayingSeconds || 0,
        totalReactionTime: user.totalReactionTime || 0,
        wins: user.wins || 0,
      },
      recentMatches: user.recentMatches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not record the match.",
    });
  }
});

module.exports = router;
