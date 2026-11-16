import { defineConfig } from "vite";

export default defineConfig({
  base: "/moneyball-companion/",
  build: {
    rollupOptions: { input: { main: "index.html", beta: "beta/index.html", scout: "beta/scouting.html", player: "beta/player.html", compare: "beta/compare.html" } },
    target: "es2022",
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
});
