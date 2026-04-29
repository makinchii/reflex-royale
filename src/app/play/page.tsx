export default function PlayPage() {
  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <div id="account-menu-root" className="account-menu-root" />
      <div id="game-root" />
      <script src="/js/pageNotifications.js" defer />
      <script src="/js/accountMenu.js" defer />
      <script type="module" src="/js/local.js" />
    </>
  );
}
