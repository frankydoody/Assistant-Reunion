import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Le tableau de bord (dossier web/) est construit dans public/, que le serveur Express sert.
// En développement : « npm run dev » (serveur) et « npm run dev:web » (Vite, avec rechargement).
export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "../public", emptyOutDir: true },
  server: { port: 5174, proxy: { "/api": "http://localhost:3100" } },
});
