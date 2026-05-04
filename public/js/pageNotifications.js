(() => {
  const notificationContainerId = "page-notifications";

  function ensureNotificationContainer() {
    let container = document.getElementById(notificationContainerId);
    if (container) return container;

    container = document.createElement("div");
    container.id = notificationContainerId;
    container.className = "page-notifications";
    document.body.appendChild(container);
    return container;
  }

  function showPageNotification(message, type = "info", timeoutMs = 4000) {
    if (!message) return null;

    const container = ensureNotificationContainer();
    const toast = document.createElement("div");
    const variant = ["info", "success", "warning", "error"].includes(type) ? type : "info";
    toast.dataset.slot = "tron-toast";
    toast.dataset.variant = variant;
    toast.className = `page-toast page-toast-${variant}`;
    toast.innerHTML = `
      <div class="page-toast-scanline" aria-hidden="true"></div>
      <div class="page-toast-content">
        <span class="page-toast-dot" aria-hidden="true"></span>
        <div class="page-toast-copy">
          <span class="page-toast-title"></span>
          <span class="page-toast-message"></span>
        </div>
        <button type="button" class="page-toast-close" aria-label="Dismiss notification">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>
      <div class="page-toast-corner page-toast-corner--top" aria-hidden="true"></div>
      <div class="page-toast-corner page-toast-corner--bottom" aria-hidden="true"></div>
    `;

    toast.querySelector(".page-toast-title").textContent = variant === "error" ? "Error" : variant;
    toast.querySelector(".page-toast-message").textContent = message;
    toast.querySelector(".page-toast-close").addEventListener("click", () => toast.remove());

    container.appendChild(toast);

    if (timeoutMs > 0) {
      window.setTimeout(() => {
        toast.remove();
      }, timeoutMs);
    }

    return toast;
  }

  window.showPageNotification = showPageNotification;
})();
