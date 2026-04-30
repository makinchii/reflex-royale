import Link from "next/link";
import type { AppAuthUser } from "@/lib/auth";

export function LandingAuthActions({ user }: { user: AppAuthUser | null }) {
  if (user) {
    return null;
  }

  return (
    <>
      <Link className="mode-card" href="/signup?next=/dashboard">
        <span className="mode-icon">📝</span>
        <span className="mode-label">Sign Up</span>
        <span className="mode-desc">Create a new account and continue to quick play.</span>
      </Link>
      <Link className="mode-card" href="/login?next=/dashboard">
        <span className="mode-icon">🔐</span>
        <span className="mode-label">Login</span>
        <span className="mode-desc">Sign in to reach your dashboard and online rooms.</span>
      </Link>
    </>
  );
}
