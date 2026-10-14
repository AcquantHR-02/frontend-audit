import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // Node fetch needs absolute URLs; MSW (msw/node) intercepts this origin.
    env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost/api", NEXT_PUBLIC_API_MOCKING: "enabled" },
  },
});
