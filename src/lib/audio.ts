import audioCatalogData from "../../lib/audioCatalogData.json";

export type AudioSource = {
  src: string;
  type: string;
  sizeBytes?: number;
};

export type AudioCategory = "lobby" | "battle";
export type AudioMixMode = "default" | "custom" | "lobby" | "battle";

export type AudioTrack = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  category: AudioCategory;
  coverImage?: string;
  thumbnailImage?: string;
  sourceUrl?: string;
  sourceTimestamp?: string;
  sources: AudioSource[];
};

type AudioCatalogTrack = {
  album?: string;
  artist: string;
  category: string;
  coverImage?: string;
  durationSeconds?: number;
  fallbackSources?: AudioSource[];
  sourceTimestamp?: string;
  sourceUrl?: string;
  title: string;
  trackId: string;
  videoId?: string;
};

const AUDIO_CATALOG_TRACKS = audioCatalogData.tracks as AudioCatalogTrack[];

function youtubeImages(videoId: string) {
  return {
    coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailImage: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

function toAudioTrack(track: AudioCatalogTrack): AudioTrack {
  const category: AudioCategory = track.category === "battle" ? "battle" : "lobby";

  if ("fallbackSources" in track && Array.isArray(track.fallbackSources)) {
    return {
      trackId: track.trackId,
      title: track.title,
      artist: track.artist,
      album: track.album ?? "Reflex Royale Catalog",
      durationSeconds: track.durationSeconds ?? 360,
      category,
      coverImage: track.coverImage,
      sourceUrl: track.sourceUrl,
      sourceTimestamp: track.sourceTimestamp,
      sources: track.fallbackSources,
    };
  }

  return {
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    album: "Reflex Royale Catalog",
    durationSeconds: 360,
    category,
    ...youtubeImages(track.videoId ?? ""),
    sourceUrl: track.sourceUrl,
    sourceTimestamp: track.sourceTimestamp,
    sources: [],
  };
}

export const AUDIO_PLAYLIST: AudioTrack[] = AUDIO_CATALOG_TRACKS.map(toAudioTrack);

export const AUDIO_PREFERENCES_CHANGED_EVENT = "reflexRoyaleAudioPreferencesChanged";
export const AUDIO_ENABLED_KEY = "reflexRoyaleAudioEnabled";
export const AUDIO_VOLUME_KEY = "reflexRoyaleAudioVolume";
export const AUDIO_MASTER_VOLUME_KEY = "reflexRoyaleAudioMasterVolume";
export const AUDIO_MUSIC_VOLUME_KEY = "reflexRoyaleAudioMusicVolume";
export const AUDIO_SFX_VOLUME_KEY = "reflexRoyaleAudioSfxVolume";
export const AUDIO_ROUND_ALERTS_KEY = "reflexRoyaleRoundAlertsEnabled";
export const AUDIO_VICTORY_PULSE_KEY = "reflexRoyaleVictoryPulseEnabled";
export const AUDIO_MIX_MODE_KEY = "reflexRoyaleAudioMixMode";
export const AUDIO_CUSTOM_TRACK_KEY = "reflexRoyaleAudioCustomTrack";
export const AUDIO_TRACK_LOOP_KEY = "reflexRoyaleAudioTrackLoop";
export const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";

export const UI_SFX_ASSETS = {
  click: { src: "/audio/ui-click.mp3", type: "audio/mpeg" },
  hover: { src: "/audio/ui-hover.mp3", type: "audio/mpeg" },
} as const;

export function clampAudioVolume(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function readAudioVolumePreference(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  return clampAudioVolume(Number(window.localStorage.getItem(key)), fallback);
}

export function readAudioTogglePreference(key: string, fallback = true) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

export function normalizeAudioMixMode(value: string | null): AudioMixMode {
  return value === "custom" || value === "lobby" || value === "battle" ? value : "default";
}

export function readAudioMixModePreference() {
  if (typeof window === "undefined") return "default";
  return normalizeAudioMixMode(window.localStorage.getItem(AUDIO_MIX_MODE_KEY));
}

export function readAudioCustomTrackPreference() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUDIO_CUSTOM_TRACK_KEY) || "";
}

export function writeAudioVolumePreference(key: string, volume: number) {
  if (typeof window === "undefined") return;
  const nextVolume = clampAudioVolume(volume, 0);
  window.localStorage.setItem(key, String(nextVolume));
  document.cookie = `${key}=${nextVolume}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioTogglePreference(key: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(enabled));
  document.cookie = `${key}=${enabled}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioMixModePreference(mode: AudioMixMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_MIX_MODE_KEY, mode);
  document.cookie = `${AUDIO_MIX_MODE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioCustomTrackPreference(trackId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_CUSTOM_TRACK_KEY, trackId);
  document.cookie = `${AUDIO_CUSTOM_TRACK_KEY}=${trackId}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export async function fetchAudioPlaylist(): Promise<AudioTrack[]> {
  const response = await fetch("/api/audio/tracks", { headers: { Accept: "application/json" } });
  if (!response.ok) return AUDIO_PLAYLIST;
  const payload = await response.json() as { tracks?: AudioTrack[] };
  return Array.isArray(payload.tracks) && payload.tracks.length > 0
    ? payload.tracks.map((track) => ({ ...track, category: track.category === "battle" ? "battle" : "lobby" }))
    : AUDIO_PLAYLIST;
}

export function getTrackIdForPath(_pathname: string): string {
  return AUDIO_PLAYLIST[0].trackId;
}

export function getPlayableSource(track: AudioTrack | undefined, audioElement: HTMLAudioElement | null): AudioSource | null {
  if (!track) return null;
  if (!audioElement) return track.sources[0] ?? null;
  return track.sources.find((source) => audioElement.canPlayType(source.type) !== "") ?? track.sources[0] ?? null;
}

export function playUiClick() {
  if (typeof window === "undefined") return;
  window.__reflexRoyalePlayUiClick?.();
}

declare global {
  interface Window {
    __reflexRoyalePlayUiClick?: () => void;
    __reflexRoyaleSetFavicon?: () => void;
  }
}
