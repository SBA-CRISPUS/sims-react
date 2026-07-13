import { defineConfig } from "vitest/config";

/**
 * Isolated config for the Firestore security-rules attack panel. Runs
 * ONLY under `npm run test:rules`, which boots the Firestore emulator
 * first (firebase emulators:exec). Kept separate from the app's unit
 * tests so a machine without the emulator/Java still runs `npm test`.
 */
export default defineConfig({
  test: {
    include: ["test/rules/**/*.test.ts"],
    environment: "node",
    // Emulator round-trips are slower than pure-JS unit tests, and the
    // suites share one emulator, so run files sequentially.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
