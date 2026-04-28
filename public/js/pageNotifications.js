const NOTIFICATION_CONTAINER_ID = "page-notifications";

function ensureNotificationContainer() {
  let container = document.getElementById(NOTIFICATION_CONTAINER_ID);
  if (container) return container;

  container = document.createElement("div");
  container.id = NOTIFICATION_CONTAINER_ID;
  container.className = "page-notifications";
  document.body.appendChild(container);
  return container;
}

function showPageNotification(message, type = "info", timeoutMs = 4000) {
  if (!message) return null;

  const container = ensureNotificationContainer();
  const toast = document.createElement("div");
  toast.className = `page-toast page-toast-${type}`;
  toast.innerHTML = `
    <span class="page-toast-message"></span>
    <button type="button" class="page-toast-close" aria-label="Dismiss notification">×</button>
  `;

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
