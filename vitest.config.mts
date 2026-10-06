import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Les tests portent sur les calculs purs : aucun ne doit ouvrir la base.
    env: { DATABASE_URL: "", DIRECT_URL: "" },
  },
});
