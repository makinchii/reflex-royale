const { defineConfig, devices } = require("@playwright/test");

const PORT = 3100;

module.exports = defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node server.js",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: "production",
      NEXT_FRONTEND: "true",
      MONGODB_URI: "",
      VISUAL_TEST_AUTH: "true",
    },
  },
});
