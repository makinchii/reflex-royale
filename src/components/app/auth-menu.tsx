"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/thegridcn/button";
import type { AppAuthUser } from "@/lib/auth";

const THEME_KEY = "ui-lab-theme";
const CUSTOM_THEME_COLOR_KEY = "reflexRoyaleCustomThemeColor";
const THEME_COMMAND_KEY = "reflexRoyaleThemeCommand";

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function resetThemeToTron() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(THEME_KEY, "tron");
  window.localStorage.setItem(THEME_COMMAND_KEY, "tron");
  window.localStorage.removeItem(CUSTOM_THEME_COLOR_KEY);
  document.cookie = `${THEME_KEY}=tron; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${THEME_COMMAND_KEY}=tron; path=/; max-age=31536000; samesite=lax`;
  clearCookie(CUSTOM_THEME_COLOR_KEY);
  document.documentElement.dataset.theme = "tron";
  document.body.dataset.theme = "tron";
  [document.documentElement, document.body].forEach((node) => {
    ["--primary", "--accent", "--ring", "--border", "--input", "--glow", "--glow-muted", "--sidebar-primary", "--sidebar-border", "--sidebar-ring"].forEach((property) => {
      node.style.removeProperty(property);
    });
  });
  window.__reflexRoyaleSetFavicon?.();
}

export async function performLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  resetThemeToTron();
}

export function AuthMenu({ user }: { user: AppAuthUser | null }) {
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild variant="outline" className="gap-2 border-primary/30 bg-card/70 font-mono uppercase tracking-[0.18em] text-primary hover:bg-primary/10">
        <a href="/login?next=/dashboard" aria-label="Log in">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--glow)_80%,transparent)]" />
          Guest
          <LogIn className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" className="gap-2 border-primary/35 bg-card/75 font-mono uppercase tracking-[0.18em] text-primary hover:bg-primary/10" onClick={() => router.push("/dashboard")}>
      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--glow)_80%,transparent)]" />
      <span className="max-w-32 truncate">{user.username}</span>
    </Button>
  );
}
