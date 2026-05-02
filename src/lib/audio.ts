export type AudioTrackId = "landing" | "dashboard" | "auth" | "play-local" | "play-online" | "ui-lab";

export const AUDIO_TRACKS: Record<AudioTrackId, string | null> = {
  landing: "/audio/landing.mp3",
  dashboard: "/audio/dashboard.mp3",
  auth: "/audio/auth.mp3",
  "play-local": "/audio/play-local.mp3",
  "play-online": "/audio/play-online.mp3",
  "ui-lab": null,
};

export function getTrackForPath(pathname: string): string | null {
  if (pathname === "/") return AUDIO_TRACKS.landing;
  if (pathname === "/navigate") return AUDIO_TRACKS.dashboard;
  if (pathname === "/dashboard") return AUDIO_TRACKS.dashboard;
  if (pathname === "/login" || pathname === "/signup") return AUDIO_TRACKS.auth;
  if (pathname === "/local") return AUDIO_TRACKS["play-local"];
  if (pathname === "/online") return AUDIO_TRACKS["play-online"];
  if (pathname === "/ui-lab") return AUDIO_TRACKS["ui-lab"];
  return null;
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
