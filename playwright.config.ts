import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".playwright");
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 90000,
  reporter: "list", use: { baseURL: "http://127.0.0.1:3001", channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --port 3001", url: "http://127.0.0.1:3001", timeout: 120000,
    reuseExistingServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1",
    env: { DATABASE_PATH: `./data/e2e-${Date.now()}.sqlite`, ADMIN_TOKEN: "playwright-local-key", NEXT_TELEMETRY_DISABLED: "1", ENROADS_BROWSER_ENABLED:"0" },
  },
});
