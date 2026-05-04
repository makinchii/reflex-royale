const mongoose = require("mongoose");

// intentionally small so it is easy to extend later.
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0
    },
    wins: {
      type: Number,
      default: 0,
      min: 0
    },
    currentWinStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    bestWinStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    falseStarts: {
      type: Number,
      default: 0,
      min: 0
    },
    reactions: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReactionTime: {
      type: Number,
      default: 0,
      min: 0
    },
    timeSpentPlayingSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    preferredThemeCommand: {
      type: String,
      enum: ["ares", "vulcan", "apollo", "aphrodite", "bacchus", "tron", "gaia", "olympus"],
      default: "tron"
    },
    preferredThemeColor: {
      type: String,
      default: "#00d4ff",
      match: /^#[0-9a-fA-F]{6}$/
    },
    preferredThemeShades: {
      type: Map,
      of: String,
      default: {}
    },
    recentMatches: {
      type: [
        {
          mode: {
            type: String,
            enum: ["local", "online"],
            required: true
          },
          place: {
            type: Number,
            required: true,
            min: 1
          },
          averageReactionTime: {
            type: Number,
            required: true,
            min: 1
          },
          playedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
