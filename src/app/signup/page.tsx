import Script from "next/script";

export default function SignupPage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <main className="container">
        <h1>Sign Up</h1>
        <p className="helper-text">Create your account to unlock quick play, local matches, and online rooms.</p>
        <form id="signup-form">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />

          <button type="submit">Create Account</button>
        </form>
        <p><a href="/login">Already have an account? Login</a></p>
        <p><a href="/">Back to home</a></p>
      </main>
      <Script src="/js/pageNotifications.js" strategy="afterInteractive" />
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
