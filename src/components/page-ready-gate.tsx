"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __reflexRoyaleLegacyReady?: boolean;
  }
}

export function PageReadyGate() {
  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    function waitsForLegacyReady() {
      return Boolean(document.querySelector("[data-wait-for-legacy-ready='true']"));
    }

    async function waitForLegacyReady() {
      if (!waitsForLegacyReady() || window.__reflexRoyaleLegacyReady) {
        return;
      }

      await new Promise<void>((resolve) => {
        window.addEventListener("reflex-royale-legacy-ready", () => resolve(), { once: true });
      });
    }

    async function revealWhenStable() {
      if (document.readyState !== "complete") {
        await new Promise<void>((resolve) => {
          window.addEventListener("load", () => resolve(), { once: true });
        });
      }

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Font readiness is a visual optimization; do not block forever on it.
        }
      }

      await waitForLegacyReady();

      frameId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            document.documentElement.dataset.pageReady = "true";
          }
        });
      });
    }

    revealWhenStable();

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      delete document.documentElement.dataset.pageReady;
      window.__reflexRoyaleLegacyReady = false;
    };
  }, []);

  return null;
}
