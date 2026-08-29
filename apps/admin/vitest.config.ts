import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Inclui apenas testes unitários — exclui e2e do Playwright
    include: ["domain/**/*.test.ts", "**/__tests__/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", "**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["domain/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
