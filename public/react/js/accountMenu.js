async function mountAccountMenu(options = {}) {
  const root = document.getElementById(options.rootId || "account-menu-root");
  if (!root) return;

  try {
    const response = await fetch("/api/auth/session");
    const state = await response.json();

    if (!state.authenticated) {
      root.innerHTML = `
        <div class="account-menu-wrap">
          <button type="button" id="accountMenuButton" class="account-menu-button" aria-expanded="false">
            <span class="account-dot account-dot-guest"></span>
            <span class="account-name">Guest</span>
            <span class="account-caret">▾</span>
          </button>
          <div id="accountMenuPanel" class="account-menu-panel" hidden>
            <a class="account-menu-item" href="/login?next=/dashboard" id="accountLoginLink">Log In</a>
          </div>
        </div>
      `;

      const button = document.getElementById("accountMenuButton");
      const panel = document.getElementById("accountMenuPanel");
      const loginLink = document.getElementById("accountLoginLink");

      const closeMenu = () => {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
      };

      button.addEventListener("click", () => {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
      });

      document.addEventListener("click", (event) => {
        if (!root.contains(event.target)) closeMenu();
      });

      loginLink.addEventListener("click", closeMenu);
      return;
    }

    root.innerHTML = `
      <div class="account-menu-wrap">
        <button type="button" id="accountMenuButton" class="account-menu-button" aria-expanded="false">
          <span class="account-dot"></span>
          <span class="account-name">${escapeHtml(state.user.username)}</span>
          <span class="account-caret">▾</span>
        </button>
        <div id="accountMenuPanel" class="account-menu-panel" hidden>
          <button type="button" class="account-menu-item" id="accountLogoutBtn">Log Out</button>
        </div>
      </div>
    `;

    const button = document.getElementById("accountMenuButton");
    const panel = document.getElementById("accountMenuPanel");
    const logoutBtn = document.getElementById("accountLogoutBtn");

    const closeMenu = () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) closeMenu();
    });

    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  } catch {
    root.innerHTML = "";
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

window.mountAccountMenu = mountAccountMenu;
