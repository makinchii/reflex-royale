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
      window.location.href = result.redirectTo;
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
