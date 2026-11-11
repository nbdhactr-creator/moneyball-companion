import { defineConfig } from "vite";

export default defineConfig({
  base: "/moneyball-companion/",
  build: {
    target: "es2022",
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
});
