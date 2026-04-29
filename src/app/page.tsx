export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <main className="mode-select">
        <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
        <p className="subtitle">Create an account or log in, then jump into a quick match with friends.</p>

        <div className="mode-cards">
          <a className="mode-card" href="/dashboard">
            <span className="mode-icon">⚡</span>
            <span className="mode-label">Quick Play</span>
            <span className="mode-desc">Head into the game hub and choose between local play or an online room</span>
          </a>
          <a className="mode-card" href="/signup?next=/dashboard">
            <span className="mode-icon">📝</span>
            <span className="mode-label">Sign Up</span>
            <span className="mode-desc">Create a new account using your existing signup flow, then continue to quick play</span>
          </a>
          <a className="mode-card" href="/login?next=/dashboard">
            <span className="mode-icon">🔐</span>
            <span className="mode-label">Login</span>
            <span className="mode-desc">Use your existing login flow and continue straight to the game menu after success</span>
          </a>
        </div>
      </main>
    </>
  );
}
