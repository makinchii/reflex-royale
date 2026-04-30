"use client";

import { useEffect, useId, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    mountAccountMenu?: (options?: { rootId?: string }) => void;
    __reflexRoyaleRemoteCleanup?: () => void;
    __reflexRoyaleAccountMenuCleanup?: () => void;
    __reflexRoyaleLegacyReady?: boolean;
  }
}

export function RemotePlayShell() {
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [accountMenuReady, setAccountMenuReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
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
      window.__reflexRoyaleRemoteCleanup?.();
      window.__reflexRoyaleAccountMenuCleanup?.();
      window.__reflexRoyaleLegacyReady = false;
    };
  }, []);

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
      <Script
        src={`/socket.io/socket.io.js?v=${moduleVersion}`}
        strategy="afterInteractive"
        onLoad={() => setSocketReady(true)}
      />
      {notificationsReady && accountMenuReady && socketReady ? (
        <Script src={`/js/remote.js?v=${moduleVersion}`} strategy="afterInteractive" type="module" />
      ) : null}
    </>
  );
}
