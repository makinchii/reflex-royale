const audioCatalogData = require("./audioCatalogData.json");

const FLOWER_FIELDS_TRACK_ID = audioCatalogData.flowerFieldsTrackId;

function youtubeImages(videoId) {
  return {
    coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailImage: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  };
}

function requestedTrack({ trackId, title, artist, category, videoId, sourceUrl, extractStartSeconds, sourceTimestamp }) {
  return {
    trackId,
    title,
    artist,
    album: "Reflex Royale Catalog",
    durationSeconds: 360,
    category,
    maxExtractSeconds: 360,
    ...(extractStartSeconds ? { extractStartSeconds } : {}),
    ...youtubeImages(videoId),
    sourceUrl,
    ...(sourceTimestamp ? { sourceTimestamp } : {})
  };
}

const AUDIO_LIBRARY = audioCatalogData.tracks.map((track) => track.videoId ? requestedTrack(track) : { ...track });

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
    thumbnailImage: track.thumbnailImage || track.coverImage,
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
