"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    mountAccountMenu?: (options?: { rootId?: string }) => void;
    __reflexRoyaleAccountMenuCleanup?: () => void;
  }
}

type LegacyShellScriptsProps = {
  accountMenuRootId?: string;
  includeAccountMenu?: boolean;
  includePageNotifications?: boolean;
  includeScriptJs?: boolean;
  includeLocalGame?: boolean;
  includeRemoteGame?: boolean;
};

export function LegacyShellScripts({
  accountMenuRootId = "account-menu-root",
  includeAccountMenu = false,
  includePageNotifications = false,
  includeScriptJs = false,
  includeLocalGame = false,
  includeRemoteGame = false,
}: LegacyShellScriptsProps) {
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    return () => {
      window.__reflexRoyaleAccountMenuCleanup?.();
    };
  }, []);

  return (
    <>
      {includeAccountMenu ? (
        <Script
          src="/js/accountMenu.js"
          strategy="afterInteractive"
          onLoad={() => window.mountAccountMenu?.({ rootId: accountMenuRootId })}
        />
      ) : null}
      {includePageNotifications ? (
        <Script src="/js/pageNotifications.js" strategy="afterInteractive" />
      ) : null}
      {includeScriptJs ? <Script src="/script.js" strategy="afterInteractive" /> : null}
      {includeLocalGame ? (
        <Script src="/js/local.js" strategy="afterInteractive" type="module" />
      ) : null}
      {includeRemoteGame ? (
        <Script src="/socket.io/socket.io.js" strategy="afterInteractive" onLoad={() => setSocketReady(true)} />
      ) : null}
      {includeRemoteGame && socketReady ? (
        <Script src="/js/remote.js" strategy="afterInteractive" />
      ) : null}
    </>
  );
}
