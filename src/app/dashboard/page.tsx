import Script from "next/script";

export default function DashboardPage() {
  return (
    <>
      <div id="account-menu-root" className="account-menu-root" />
      <main className="mode-select" data-page="dashboard">
        <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
        <p className="subtitle" id="dashboard-subtitle">Choose how you want to play.</p>

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
      <Script src="/js/accountMenu.js" strategy="afterInteractive" />
      <Script src="/js/pageNotifications.js" strategy="afterInteractive" />
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
