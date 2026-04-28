export default function PlayOnlinePage() {
  return (
    <>
      <div id="account-menu-root" className="account-menu-root" />
      <div id="game-root" />
      <script src="/socket.io/socket.io.js" defer />
      <script src="/js/pageNotifications.js" defer />
      <script src="/js/accountMenu.js" defer />
      <script src="/js/remote.js" defer />
    </>
  );
}
