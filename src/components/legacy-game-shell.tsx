"use client";

import { useEffect, useId, useState } from "react";
import { flushSync } from "react-dom";
import Script from "next/script";
import { LocalGameTransition, LocalPlayerSplash, type LocalTransitionPlayer } from "@/components/app/local-game-transition";

declare global {
  interface Window {
    mountAccountMenu?: (options?: { rootId?: string }) => void;
    __reflexRoyaleLocalThemeShades?: Record<string, string>;
    __reflexRoyaleLocalCleanup?: () => void;
    __reflexRoyaleRemoteCleanup?: () => void;
    __reflexRoyaleAccountMenuCleanup?: () => void;
    __reflexRoyaleLegacyReady?: boolean;
  }
}

const LOCAL_TRANSITION_EVENT = "reflex-royale-local-transition";
const LOCAL_TRANSITION_DURATION_MS = 3000;

type LocalTransitionDetail = {
  duration: number;
  splashDuration: number;
  players: LocalTransitionPlayer[];
  phase: "tunnel" | "splash";
};

type LegacyGameShellProps = {
  mode: "local" | "remote";
  showAccountMenu?: boolean;
  localPlayerThemeShades?: Record<string, string> | null;
};

export function LegacyGameShell({ mode, showAccountMenu = true, localPlayerThemeShades = null }: LegacyGameShellProps) {
  const [notificationsReady, setNotificationsReady] = useState(mode === "local");
  const [accountMenuReady, setAccountMenuReady] = useState(!showAccountMenu);
  const [socketReady, setSocketReady] = useState(mode === "local");
  const [legacyScriptVersion, setLegacyScriptVersion] = useState("");
  const [localTransition, setLocalTransition] = useState<LocalTransitionDetail | null>(null);
  const moduleVersion = useId().replace(/:/g, "");

  useEffect(() => {
    window.__reflexRoyaleLegacyReady = false;
    if (localPlayerThemeShades) {
      window.__reflexRoyaleLocalThemeShades = localPlayerThemeShades;
    } else {
      window.__reflexRoyaleLocalThemeShades = undefined;
    }
    delete document.documentElement.dataset.pageReady;
    setLegacyScriptVersion(`${moduleVersion}-${Date.now()}`);

    const handleLegacyReady = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.documentElement.dataset.pageReady = "true";
        });
      });
    };

    window.addEventListener("reflex-royale-legacy-ready", handleLegacyReady);

    return () => {
      window.removeEventListener("reflex-royale-legacy-ready", handleLegacyReady);
      if (mode === "local") {
        window.__reflexRoyaleLocalCleanup?.();
      } else {
        window.__reflexRoyaleRemoteCleanup?.();
      }
      window.__reflexRoyaleAccountMenuCleanup?.();
      window.__reflexRoyaleLegacyReady = false;
      window.__reflexRoyaleLocalThemeShades = undefined;
    };
  }, [localPlayerThemeShades, mode, moduleVersion]);

  useEffect(() => {
    let tunnelTimeout: number | null = null;
    let clearTimeoutId: number | null = null;
    const handleTransition = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const duration = typeof detail?.duration === "number" ? detail.duration : LOCAL_TRANSITION_DURATION_MS;
      const splashDuration = typeof detail?.splashDuration === "number" ? detail.splashDuration : 2800;
      const players = Array.isArray(detail?.players) ? detail.players : [];
      if (tunnelTimeout) window.clearTimeout(tunnelTimeout);
      if (clearTimeoutId) window.clearTimeout(clearTimeoutId);
      flushSync(() => {
        setLocalTransition({ duration, splashDuration, players, phase: "tunnel" });
      });
      tunnelTimeout = window.setTimeout(() => {
        setLocalTransition({ duration, splashDuration, players, phase: "splash" });
        tunnelTimeout = null;
      }, duration);
      clearTimeoutId = window.setTimeout(() => {
        setLocalTransition(null);
        clearTimeoutId = null;
      }, duration + splashDuration);
    };

    window.addEventListener(LOCAL_TRANSITION_EVENT, handleTransition);

    return () => {
      window.removeEventListener(LOCAL_TRANSITION_EVENT, handleTransition);
      if (tunnelTimeout) window.clearTimeout(tunnelTimeout);
      if (clearTimeoutId) window.clearTimeout(clearTimeoutId);
    };
  }, []);

  return (
    <>
      <link rel="stylesheet" href={`/game.css?v=${moduleVersion}`} />
      <div data-wait-for-legacy-ready="true" className="flex min-h-0 w-full flex-1">
        {showAccountMenu ? <div id="account-menu-root" className="account-menu-root" suppressHydrationWarning /> : null}
        <div id="game-root" suppressHydrationWarning />
        {localTransition?.phase === "tunnel" ? (
          <LocalGameTransition className="local-game-transition-overlay" durationMs={localTransition.duration} />
        ) : null}
        {localTransition?.phase === "splash" ? (
          <LocalPlayerSplash className="local-player-splash-overlay" players={localTransition.players} durationMs={localTransition.splashDuration} />
        ) : null}
      </div>

      <Script src={`/js/pageNotifications.js?v=${moduleVersion}`} strategy="afterInteractive" onLoad={() => setNotificationsReady(true)} />
      {showAccountMenu ? (
        <Script
          src={`/js/accountMenu.js?v=${moduleVersion}`}
          strategy="afterInteractive"
          onLoad={() => {
            setAccountMenuReady(true);
            window.mountAccountMenu?.({ rootId: "account-menu-root" });
          }}
        />
      ) : null}
      {mode === "remote" ? (
        <Script src={`/socket.io/socket.io.js?v=${moduleVersion}`} strategy="afterInteractive" onLoad={() => setSocketReady(true)} />
      ) : null}
      {notificationsReady && accountMenuReady && socketReady && legacyScriptVersion ? (
        <Script src={`/js/${mode}.js?v=${legacyScriptVersion}`} strategy="afterInteractive" type="module" />
      ) : null}
    </>
  );
}
