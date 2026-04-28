function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!next || !next.startsWith("/")) {
    return null;
  }

  return next;
}

async function handleAuthSubmit(event, endpoint) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const username = formData.get("username")?.trim();
  const password = formData.get("password");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (window.showPageNotification) {
      window.showPageNotification(result.message, result.success ? "success" : "error");
    }

    if (result.success && result.redirectTo) {
      window.location.href = getNextPath() || result.redirectTo;
    }
  } catch (error) {
    if (window.showPageNotification) {
      window.showPageNotification("Something went wrong. Please try again.", "error");
    }
  }
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, "/api/auth/signup")
  );
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, "/api/auth/login")
  );
}

const dashboardPage = document.body?.dataset.page === "dashboard";
if (dashboardPage) {
  fetch("/api/auth/session")
    .then((response) => response.json())
    .then((authState) => {
      const subtitle = document.getElementById("dashboard-subtitle");
      if (subtitle) {
        subtitle.textContent = authState.authenticated
          ? `${authState.user.username}, pick a mode to start your next reflex showdown.`
          : "Guest, pick a mode to start your next reflex showdown.";
      }

      const logoutButton = document.getElementById("logout-btn");
      if (logoutButton && authState.authenticated) {
        logoutButton.addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/";
        });
      } else if (logoutButton) {
        logoutButton.textContent = "Log In";
        logoutButton.addEventListener("click", () => {
          window.location.href = "/login?next=/dashboard";
        });
      }

      if (window.mountAccountMenu) {
        window.mountAccountMenu({ rootId: "account-menu-root" });
      }
    })
    .catch(() => {
      const subtitle = document.getElementById("dashboard-subtitle");
      if (subtitle) {
        subtitle.textContent = "Guest, pick a mode to start your next reflex showdown.";
      }

      const logoutButton = document.getElementById("logout-btn");
      if (logoutButton) {
        logoutButton.textContent = "Log In";
        logoutButton.addEventListener("click", () => {
          window.location.href = "/login?next=/dashboard";
        });
      }

      if (window.mountAccountMenu) {
        window.mountAccountMenu({ rootId: "account-menu-root" });
      }
    });
}
