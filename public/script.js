const AUTH_STORAGE_KEY = "reflexRoyaleAuth";
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!next || !next.startsWith("/")) {
    return null;
  }

  return next;
}

function saveAuthState(username) {
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      username,
      authenticatedAt: Date.now()
    })
  );
}

function clearAuthState() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Not logged in.");
  }

  return result.user;
}

async function loadLeaderboard(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = '<p class="hint">Loading leaderboard...</p>';

  try {
    const response = await fetch("/leaderboard");
    const result = await response.json();

    if (!result.success) {
      container.innerHTML = `<p class="message error">${result.message || "Could not load leaderboard."}</p>`;
      return;
    }

    const leaderboard = result.leaderboard || [];
    if (!leaderboard.length) {
      container.innerHTML = '<div class="leaderboard-empty"><p class="hint">No leaderboard data yet.</p></div>';
      return;
    }

    container.innerHTML = `
      <table class="standings-table leaderboard-table">
        <thead>
          <tr><th>Rank</th><th>Player</th><th>Best Score</th></tr>
        </thead>
        <tbody>
          ${leaderboard.map((entry, index) => `
            <tr class="leaderboard-row ${index < 3 ? `top-${index + 1}` : ""}">
              <td>
                <span class="rank-badge ${index < 3 ? `top-${index + 1}` : "standard"}">
                  ${index + 1}
                </span>
              </td>
              <td>${escapeHtml(entry.username)}</td>
              <td>${entry.bestScore > 0 ? `${entry.bestScore} ms` : "Not played yet"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = '<p class="message error">Could not load leaderboard.</p>';
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

async function handleAuthSubmit(event, endpoint) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const username = formData.get("username")?.trim();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const messageElement = document.getElementById("message");

  if (messageElement) {
    messageElement.textContent = "";
    messageElement.className = "message";
  }

  if (endpoint.includes("signup") && confirmPassword !== null && password !== confirmPassword) {
    if (messageElement) {
      messageElement.textContent = "Passwords do not match.";
      messageElement.classList.add("error");
    }
    return;
  }

  if (!username || !USERNAME_PATTERN.test(username)) {
    if (messageElement) {
      messageElement.textContent = "Username must be 3-20 characters and use only letters, numbers, underscores, or hyphens.";
      messageElement.classList.add("error");
    }
    return;
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    if (messageElement) {
      messageElement.textContent = "Password must be at least 8 characters.";
      messageElement.classList.add("error");
    }
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (messageElement) {
      messageElement.textContent = result.message;
      messageElement.classList.add(result.success ? "success" : "error");
    }

    if (result.success && result.redirectTo) {
      saveAuthState(username);
      window.location.href = getNextPath() || result.redirectTo;
    }
  } catch (error) {
    if (messageElement) {
      messageElement.textContent = "Something went wrong. Please try again.";
      messageElement.classList.add("error");
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

const dashboardPage = Boolean(document.querySelector('[data-page="dashboard"]'));
if (dashboardPage) {
  initDashboardPage();
}

const leaderboardPage = document.body?.dataset.page === "leaderboard";
if (leaderboardPage) {
  initLeaderboardPage();
}

async function initDashboardPage() {
  const dashboardRoot = document.querySelector('[data-page="dashboard"]');
  if (dashboardRoot?.dataset.serverAuth === "true") {
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
          // Client-side auth state is still cleared below.
        }
        clearAuthState();
        window.location.href = "/";
      });
    }
    return;
  }

  try {
    const user = await fetchCurrentUser();
    saveAuthState(user.username);

    const subtitle = document.getElementById("dashboard-subtitle");
    if (subtitle) {
      subtitle.textContent = "Welcome back. Open an online room, chase the leaderboard, or hold position from your neon command center.";
    }

    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
          // Client-side auth state is still cleared below.
        }
        clearAuthState();
        window.location.href = "/";
      });
    }
  } catch (error) {
    clearAuthState();
    window.location.href = "/login?next=/dashboard";
  }
}

async function initLeaderboardPage() {
  try {
    const user = await fetchCurrentUser();
    saveAuthState(user.username);

    loadLeaderboard("leaderboard-page-content");
  } catch (error) {
    clearAuthState();
    window.location.href = "/login?next=/leaderboard-page";
  }
}
