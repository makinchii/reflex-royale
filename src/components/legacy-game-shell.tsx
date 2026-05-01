"use client";

import { useEffect, useId, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    mountAccountMenu?: (options?: { rootId?: string }) => void;
    __reflexRoyaleLocalCleanup?: () => void;
    __reflexRoyaleRemoteCleanup?: () => void;
    __reflexRoyaleAccountMenuCleanup?: () => void;
    __reflexRoyaleLegacyReady?: boolean;
  }
}

type LegacyGameShellProps = {
  mode: "local" | "remote";
};

export function LegacyGameShell({ mode }: LegacyGameShellProps) {
  const [notificationsReady, setNotificationsReady] = useState(mode === "local");
  const [accountMenuReady, setAccountMenuReady] = useState(false);
  const [socketReady, setSocketReady] = useState(mode === "local");
  const moduleVersion = useId().replace(/:/g, "");

  useEffect(() => {
    window.__reflexRoyaleLegacyReady = false;
    delete document.documentElement.dataset.pageReady;

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
    };
  }, [mode]);

  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <div data-wait-for-legacy-ready="true">
        <div id="account-menu-root" className="account-menu-root" suppressHydrationWarning />
        <div id="game-root" suppressHydrationWarning />
      </div>

      <Script src={`/js/pageNotifications.js?v=${moduleVersion}`} strategy="afterInteractive" onLoad={() => setNotificationsReady(true)} />
      <Script
        src={`/js/accountMenu.js?v=${moduleVersion}`}
        strategy="afterInteractive"
        onLoad={() => {
          setAccountMenuReady(true);
          window.mountAccountMenu?.({ rootId: "account-menu-root" });
        }}
      />
      {mode === "remote" ? (
        <Script src={`/socket.io/socket.io.js?v=${moduleVersion}`} strategy="afterInteractive" onLoad={() => setSocketReady(true)} />
      ) : null}
      {notificationsReady && accountMenuReady && socketReady ? (
        <Script src={`/js/${mode}.js?v=${moduleVersion}`} strategy="afterInteractive" type="module" />
      ) : null}
    </>
  );
}
