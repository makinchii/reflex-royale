const express = require("express");
const mongoose = require("mongoose");
const AudioTrack = require("../models/AudioTrack");
const { AUDIO_LIBRARY, serializeTrack } = require("../lib/audioCatalog");

const router = express.Router();

function databaseReady() {
  return mongoose.connection.readyState === 1;
}

router.get("/tracks", async (req, res) => {
  if (!databaseReady()) {
    return res.json({ tracks: AUDIO_LIBRARY.map((track) => serializeTrack(track, req)), storage: "static-fallback" });
  }

  const dbTracks = await AudioTrack.find({}, "trackId title artist album durationSeconds category coverImage sourceUrl sourceTimestamp updatedAt variants.format variants.mimeType variants.sizeBytes").lean();
  const tracks = dbTracks.length > 0 ? dbTracks : AUDIO_LIBRARY;
  return res.json({ tracks: tracks.map((track) => serializeTrack(track, req)), storage: dbTracks.length > 0 ? "mongodb" : "static-fallback" });
});

router.get("/tracks/:trackId/stream", async (req, res) => {
  if (!databaseReady()) {
    return res.status(503).json({ success: false, message: "Audio database is not connected." });
  }

  const track = await AudioTrack.findOne({ trackId: req.params.trackId }).lean();
  if (!track) {
    return res.status(404).json({ success: false, message: "Audio track not found." });
  }

  const requestedFormat = typeof req.query.format === "string" ? req.query.format : null;
  const variant = track.variants.find((item) => item.format === requestedFormat) || track.variants[0];
  if (!variant) {
    return res.status(404).json({ success: false, message: "Audio variant not found." });
  }

  const data = Buffer.isBuffer(variant.data) ? variant.data : Buffer.from(variant.data.buffer || variant.data);
  res.set({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": variant.mimeType
  });

  const range = req.headers.range;
  if (!range) {
    res.set("Content-Length", data.length);
    return res.end(data);
  }

  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    res.set("Content-Length", data.length);
    return res.end(data);
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : data.length - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= data.length || end >= data.length || start > end) {
    res.set("Content-Range", `bytes */${data.length}`);
    return res.status(416).end();
  }

  res.status(206);
  res.set({
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${data.length}`
  });
  return res.end(data.subarray(start, end + 1));
});

module.exports = router;
