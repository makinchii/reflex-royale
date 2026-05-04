"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Lock, Network, Shield, UserPlus, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/thegridcn/button";
import { Input } from "@/components/thegridcn/input";

type AuthMode = "login" | "signup";
type MessageState = { type: "error" | "success"; text: string } | null;
type ThemeCommandId = "ares" | "vulcan" | "apollo" | "aphrodite" | "bacchus" | "tron" | "gaia" | "olympus";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const THEME_KEY = "ui-lab-theme";
const CUSTOM_THEME_COLOR_KEY = "reflexRoyaleCustomThemeColor";
const THEME_COMMAND_KEY = "reflexRoyaleThemeCommand";
const COOKIE_MAX_AGE = 31_536_000;
const THEME_COMMANDS: Record<ThemeCommandId, { theme: "tron" | "ares" | "custom"; color: string }> = {
  ares: { theme: "ares", color: "#ff003c" },
  vulcan: { theme: "custom", color: "#ff7a00" },
  apollo: { theme: "custom", color: "#ffd400" },
  aphrodite: { theme: "custom", color: "#ff2ebd" },
  bacchus: { theme: "custom", color: "#8a2bff" },
  tron: { theme: "tron", color: "#00d4ff" },
  gaia: { theme: "custom", color: "#24f07a" },
  olympus: { theme: "custom", color: "#FFFFFF" },
};

const modeContent = {
  login: {
    title: "Sign In",
    eyebrow: "Access command profile",
    description: "Sign in, then choose whether you want local quick play or an online room.",
    formId: "login-form",
    button: "Login",
    icon: Lock,
    alternateHref: "/signup",
    alternateText: "Need an account? Sign up",
  },
  signup: {
    title: "Create Account",
    eyebrow: "Register command profile",
    description: "Create your account to unlock quick play, local matches, and online rooms.",
    formId: "signup-form",
    button: "Create Account",
    icon: UserPlus,
    alternateHref: "/login",
    alternateText: "Already have an account? Login",
  },
} satisfies Record<AuthMode, {
  title: string;
  eyebrow: string;
  description: string;
  formId: string;
  button: string;
  icon: typeof Lock;
  alternateHref: string;
  alternateText: string;
}>;

export function AuthPage({ mode }: { mode: AuthMode }) {
  const content = modeContent[mode];
  const Icon = content.icon;
  const [message, setMessage] = useState<MessageState>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(username: string, password: string) {
    if (!USERNAME_PATTERN.test(username)) {
      return "Username must be 3-20 characters and use only letters, numbers, underscores, or hyphens.";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return "Password must be at least 8 characters.";
    }

    return null;
  }

  function getNextPath() {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? next : null;
  }

  function applyAccountTheme(user: { preferredThemeCommand?: string; preferredThemeColor?: string } | undefined) {
    const commandId = user?.preferredThemeCommand && user.preferredThemeCommand in THEME_COMMANDS
      ? user.preferredThemeCommand as ThemeCommandId
      : "tron";
    const command = THEME_COMMANDS[commandId];
    const color = user?.preferredThemeColor && /^#[0-9a-fA-F]{6}$/.test(user.preferredThemeColor)
      ? user.preferredThemeColor
      : command.color;

    window.localStorage.setItem(THEME_KEY, command.theme);
    window.localStorage.setItem(THEME_COMMAND_KEY, commandId);
    document.cookie = `${THEME_KEY}=${command.theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${THEME_COMMAND_KEY}=${commandId}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;

    if (command.theme === "custom") {
      window.localStorage.setItem(CUSTOM_THEME_COLOR_KEY, color);
      document.cookie = `${CUSTOM_THEME_COLOR_KEY}=${color}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      window.localStorage.removeItem(CUSTOM_THEME_COLOR_KEY);
      document.cookie = `${CUSTOM_THEME_COLOR_KEY}=; path=/; max-age=0; samesite=lax`;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const validationError = validate(username, password);

    setMessage(null);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage({ type: "error", text: result.message || "Authentication failed. Please try again." });
        return;
      }

      applyAccountTheme(result.user);
      setMessage({ type: "success", text: result.message || "Authenticated." });
      window.location.href = getNextPath() || result.redirectTo || "/dashboard";
    } catch {
      setMessage({ type: "error", text: "Could not reach the authentication server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="relative flex min-h-svh overflow-hidden bg-background text-foreground">
        <div className="landing-global-grid" aria-hidden="true" />

        <section className="relative hidden w-1/2 overflow-hidden border-r border-primary/20 bg-card/10 lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_12%,transparent)_0%,transparent_68%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_oklch,var(--primary)_7%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--primary)_7%,transparent)_1px,transparent_1px)] bg-[size:44px_44px]" />

          <div className="relative z-10 flex max-w-md flex-col items-center px-12 text-center">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 shadow-[0_0_44px_color-mix(in_oklch,var(--primary)_22%,transparent)]">
              <Zap className="h-10 w-10 text-primary" />
            </div>

            <h1 className="fluorescent-title font-display text-3xl font-black uppercase tracking-[0.22em] text-primary">
              Reflex Royale
            </h1>
            <div className="mx-auto mt-4 flex items-center gap-2">
              <div className="h-px w-8 bg-primary/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">Enter the Grid</span>
              <div className="h-px w-8 bg-primary/60" />
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Secure access to the reaction command center. Launch local runs, join online rooms, and chase the leaderboard from one neon interface.
            </p>

            <div className="mt-10 space-y-4 text-left">
              {[
                { icon: <Shield className="h-4 w-4" />, label: "Protected session handoff" },
                { icon: <Network className="h-4 w-4" />, label: "Online rooms and local queue" },
                { icon: <Activity className="h-4 w-4" />, label: "Live leaderboard sync" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/5 text-primary/70">
                    {item.icon}
                  </div>
                  <span className="font-mono text-xs tracking-wide text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 w-full rounded border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[9px] uppercase tracking-widest text-primary/60">System Status</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary/80">Operational</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-primary/25" />
          <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-primary/25" />
          <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary/25" />
          <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary/25" />
        </section>

        <section className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_oklch,var(--primary)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--primary)_4%,transparent)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />

          <div className="relative z-10 w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center lg:hidden">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 shadow-[0_0_24px_color-mix(in_oklch,var(--primary)_20%,transparent)]">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <span className="fluorescent-title font-display text-lg font-bold uppercase tracking-[0.15em] text-primary">Reflex Royale</span>
            </div>

            <div className="relative overflow-hidden rounded border border-primary/25 bg-card/80 p-6 shadow-[0_0_38px_color-mix(in_oklch,var(--primary)_12%,transparent)] backdrop-blur-xl sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.02)_2px,rgba(0,0,0,0.02)_4px)]" />
              <div className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-primary/35" />
              <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-primary/35" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-primary/35" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-primary/35" />

              <div className="relative mb-6 text-center">
                <div className="mb-1 hidden items-center justify-center lg:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-primary/30 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <h2 className="mt-3 font-display text-xl font-bold uppercase tracking-wider text-foreground lg:mt-4">{content.title}</h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{content.eyebrow}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{content.description}</p>
              </div>

              <form id={content.formId} method="post" action={mode === "signup" ? "/api/auth/signup" : "/api/auth/login"} noValidate onSubmit={handleSubmit} className="relative space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Username
                  </label>
                  <Input id="username" name="username" type="text" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]+" autoComplete="username" placeholder="operator" className="border-primary/20 bg-background/50 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/20" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Password
                  </label>
                  <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Enter password" className="border-primary/20 bg-background/50 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/20" />
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">Minimum 8 characters.</p>
                </div>

                <div id="message" className="min-h-12" aria-live="polite">
                  {message ? (
                    <div className={`flex items-start gap-2 rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${message.type === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                      {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span className="leading-5">{message.text}</span>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" size="lg" disabled={submitting} className="w-full cursor-pointer font-mono text-xs uppercase tracking-widest shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_20%,transparent)] transition-all duration-300 hover:shadow-[0_0_30px_color-mix(in_oklch,var(--primary)_35%,transparent)]">
                  <Zap className="h-4 w-4" />
                  {submitting ? "Authenticating" : content.button}
                </Button>
              </form>

              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t border-primary/15" />
                <span className="px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Account Link</span>
                <div className="flex-1 border-t border-primary/15" />
              </div>

              <div className="relative text-center">
                <Link href={content.alternateHref} className="font-mono text-[10px] uppercase tracking-widest text-primary/70 transition-colors hover:text-primary">
                  {content.alternateText}
                </Link>
                <div className="mt-3">
                  <Link href="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">CS 160 : Team 3 // Encrypted Session</p>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}
