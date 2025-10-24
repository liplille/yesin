// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string; // mémorise le dernier chemin pour Meta
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search + location.hash;

    // ✅ Google Analytics : OK de tirer à chaque navigation SPA
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: path });
    }

    // ✅ Meta Pixel : éviter les doublons automatiques
    if (typeof window.fbq === "function") {
      // Si c'est le tout premier rendu, on ne fait rien → le snippet index.html a déjà tiré le PageView
      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = path;
        console.log(`Meta Pixel initial path registered: ${path}`);
        return;
      }

      // Si on change d'URL → tirer un PageView SPA (sans doublon)
      if (window.__lastMetaPVPath !== path) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = path;
        console.log(`Meta Pixel PageView (SPA nav): ${path}`);
      }
    } else {
      console.warn("Meta Pixel (fbq) is not available.");
    }
  }, [location]);

  return null;
}
