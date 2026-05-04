const mongoose = require("mongoose");

const audioVariantSchema = new mongoose.Schema(
  {
    format: {
      type: String,
      enum: ["webm", "mp3"],
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    bitrateKbps: Number,
    sizeBytes: Number,
    data: {
      type: Buffer,
      required: true
    }
  },
  { _id: false }
);

const audioTrackSchema = new mongoose.Schema(
  {
    trackId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    artist: {
      type: String,
      required: true
    },
    album: {
      type: String,
      required: true
    },
    durationSeconds: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      enum: ["lobby", "battle"],
      default: "lobby",
      index: true
    },
    coverImage: String,
    sourceUrl: String,
    sourceTimestamp: String,
    variants: {
      type: [audioVariantSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AudioTrack || mongoose.model("AudioTrack", audioTrackSchema);
