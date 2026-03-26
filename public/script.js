const AUTH_STORAGE_KEY = "reflexRoyaleAuth";

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

function readAuthState() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearAuthState() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

async function handleAuthSubmit(event, endpoint) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const username = formData.get("username")?.trim();
  const password = formData.get("password");
  const messageElement = document.getElementById("message");

  messageElement.textContent = "";
  messageElement.className = "message";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    messageElement.textContent = result.message;
    messageElement.classList.add(result.success ? "success" : "error");

    if (result.success && result.redirectTo) {
      saveAuthState(username);
      window.location.href = getNextPath() || result.redirectTo;
    }
  } catch (error) {
    messageElement.textContent = "Something went wrong. Please try again.";
    messageElement.classList.add("error");
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
  const authState = readAuthState();

  if (!authState?.username) {
    window.location.href = "/login?next=/dashboard";
  } else {
    const subtitle = document.getElementById("dashboard-subtitle");
    if (subtitle) {
      subtitle.textContent = `${authState.username}, pick a mode to start your next reflex showdown.`;
    }

    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        clearAuthState();
        window.location.href = "/";
      });
    }
  }
}
