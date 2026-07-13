import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  test: {
    // The security-rules attack panel needs a running Firestore emulator
    // (npm run test:rules), so it must never run under the plain
    // `npm test` unit pass - it would error out with no emulator.
    exclude: [...configDefaults.exclude, "test/rules/**"],
  },
});
