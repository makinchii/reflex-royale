const FLOWER_FIELDS_TRACK_ID = "flower-fields";

const AUDIO_LIBRARY = [
  {
    trackId: FLOWER_FIELDS_TRACK_ID,
    title: "Flower Fields",
    artist: "Athena IV",
    album: "Reaction Game Audio Console",
    durationSeconds: 360,
    category: "lobby",
    extractStartSeconds: 8137,
    maxExtractSeconds: 360,
    coverImage: "/images/audio/flower-fields-cover.webp",
    sourceUrl: "https://www.youtube.com/watch?v=J4njTYvvENQ&t=8137s",
    sourceTimestamp: "02:15:37",
    fallbackSources: [
      { src: "/audio/flower-fields.webm", type: "audio/webm" },
      { src: "/audio/flower-fields.mp3", type: "audio/mpeg" }
    ]
  },
  {
    trackId: "break-what-you-must",
    title: "Break What You Must",
    artist: "Destiny 2",
    album: "Music From the Grid",
    durationSeconds: 296,
    category: "battle",
    coverImage: "/images/audio/break-what-you-must-cover.webp",
    sourceUrl: "https://www.youtube.com/watch?v=44_aOyRnO9k&list=RD44_aOyRnO9k&start_radio=1",
    fallbackSources: [
      { src: "/audio/break-what-you-must.webm", type: "audio/webm" },
      { src: "/audio/break-what-you-must.mp3", type: "audio/mpeg" }
    ]
  }
];

function audioSourceVersion(track, variant = null) {
  const updatedAt = track.updatedAt ? new Date(track.updatedAt).getTime() : 0;
  return String(updatedAt || variant?.sizeBytes || track.maxExtractSeconds || track.durationSeconds || 1);
}

function appendSourceVersion(source, version) {
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}v=${encodeURIComponent(version)}`;
}

function serializeTrack(track, req = null) {
  const catalogTrack = AUDIO_LIBRARY.find((item) => item.trackId === track.trackId);
  const streamPath = `/api/audio/tracks/${track.trackId}/stream`;
  const hasDbVariants = Array.isArray(track.variants) && track.variants.length > 0;
  const sources = hasDbVariants
    ? track.variants.map((variant) => ({
        src: `${streamPath}?format=${encodeURIComponent(variant.format)}&v=${encodeURIComponent(audioSourceVersion(track, variant))}`,
        type: variant.mimeType,
        sizeBytes: variant.sizeBytes
      }))
    : (track.fallbackSources || []).map((source) => ({ ...source, src: appendSourceVersion(source.src, audioSourceVersion(track)) }));

  return {
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSeconds: track.maxExtractSeconds || track.durationSeconds,
    category: track.category || catalogTrack?.category || "lobby",
    coverImage: track.coverImage,
    sourceUrl: track.sourceUrl,
    sourceTimestamp: track.sourceTimestamp,
    sources: req ? sources.map((source) => ({ ...source, src: new URL(source.src, `${req.protocol}://${req.get("host")}`).pathname + new URL(source.src, `${req.protocol}://${req.get("host")}`).search })) : sources
  };
}

module.exports = {
  AUDIO_LIBRARY,
  FLOWER_FIELDS_TRACK_ID,
  serializeTrack
};
