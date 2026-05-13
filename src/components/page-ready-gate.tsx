"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __reflexRoyaleGameReady?: boolean;
  }
}

export function PageReadyGate() {
  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    function waitsForGameReady() {
      return Boolean(document.querySelector("[data-wait-for-game-ready='true']"));
    }

    async function waitForGameReady() {
      if (!waitsForGameReady() || window.__reflexRoyaleGameReady) {
        return;
      }

      await new Promise<void>((resolve) => {
        window.addEventListener("reflex-royale-game-ready", () => resolve(), { once: true });
      });
    }

    async function revealWhenStable() {
      await waitForGameReady();

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
      window.__reflexRoyaleGameReady = false;
    };
  }, []);

  return null;
}
