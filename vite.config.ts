import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Ajoute cette section
    proxy: {
      // Toute requête commençant par /nominatim-api sera redirigée
      "/nominatim-api": {
        target: "https://nominatim.openstreetmap.org", // La cible réelle
        changeOrigin: true, // Nécessaire pour les hôtes virtuels
        rewrite: (path) => path.replace(/^\/nominatim-api/, ""), // Retire /nominatim-api avant d'envoyer
        // Optionnel mais recommandé: Ajouter un User-Agent
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, _req, _res) => {
            proxyReq.setHeader(
              "User-Agent",
              "YesIn.media/1.0 (Contact: 301@gmx.fr)"
            ); // Mets un User-Agent pertinent
          });
        },
      },
    },
  },
});
