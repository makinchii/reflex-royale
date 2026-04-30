import { getCurrentUser } from "@/lib/auth";
import { LandingAuthActions } from "@/components/landing-auth-actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <a
        className="site-auth-badge"
        href={user ? "/dashboard" : "/login?next=/dashboard"}
        aria-label={user ? `Open dashboard for ${user.username}` : "Log in"}
      >
        <span className={`site-auth-dot${user ? "" : " site-auth-dot-guest"}`} />
        <span className="site-auth-label">{user ? user.username : "Guest"}</span>
      </a>
      <main className="mode-select">
        <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
        <p className="subtitle">
          {user
            ? "Welcome back. Jump into your dashboard or launch a quick match."
            : "Create an account or log in, then jump into a quick match with friends."}
        </p>

        <div className="mode-cards">
          <a className="mode-card" href="/dashboard">
            <span className="mode-icon">⚡</span>
            <span className="mode-label">Quick Play</span>
            <span className="mode-desc">Head into the game hub and choose between local play or an online room</span>
          </a>
          <LandingAuthActions user={user} />
        </div>
      </main>
    </>
  );
}
