import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// So spec files can import DB helpers directly (e.g. to clean up test
// fixtures created via the credentials-test provider).
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Test-only sign-in provider (src/lib/auth/index.ts) — never set outside
    // this Playwright run, never enabled in production.
    env: { AUTH_TEST_MODE: "1" },
  },
});
