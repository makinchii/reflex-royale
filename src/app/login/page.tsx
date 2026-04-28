import Script from "next/script";

export default function LoginPage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <main className="container">
        <h1>Login</h1>
        <p className="helper-text">Sign in, then choose whether you want local quick play or an online room.</p>
        <form id="login-form">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />

          <button type="submit">Login</button>
        </form>
        <p><a href="/signup">Need an account? Sign up</a></p>
        <p><a href="/">Back to home</a></p>
      </main>
      <Script src="/js/pageNotifications.js" strategy="afterInteractive" />
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
