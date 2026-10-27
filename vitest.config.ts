import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://venturely:venturely@localhost:5432/venturely_test?schema=public";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DB, NODE_ENV: "test", ANTHROPIC_API_KEY: "" },
    // Integration tests share one database; run files serially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
