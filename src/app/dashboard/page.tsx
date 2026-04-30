import { LegacyShellScripts } from "@/components/legacy-shell-scripts";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireCurrentUser("/dashboard");

  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <div id="account-menu-root" className="account-menu-root" suppressHydrationWarning />
      <main className="mode-select" data-page="dashboard" data-server-auth="true">
        <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
        <p className="subtitle">Welcome back. Open an online room, chase the leaderboard, or hold position from your neon command center.</p>

        <div className="mode-cards">
          <a className="mode-card" href="/play">
            <span className="mode-icon">🎮</span>
            <span className="mode-label">Local Play</span>
            <span className="mode-desc">2-4 players on one device, each with their own buzzer key</span>
          </a>
          <a className="mode-card" href="/play/online">
            <span className="mode-icon">🌐</span>
            <span className="mode-label">Online Room</span>
            <span className="mode-desc">Create or join a room so each player can use a separate device</span>
          </a>
        </div>

        <div className="dashboard-actions">
          <a className="btn btn-secondary" href="/">Back Home</a>
          <button type="button" className="btn btn-secondary" id="logout-btn">Log Out</button>
        </div>
      </main>
      <LegacyShellScripts includeAccountMenu includePageNotifications includeScriptJs />
    </>
  );
}
