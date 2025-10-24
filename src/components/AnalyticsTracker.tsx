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
    __lastMetaPVPath?: string; // mémorise le dernier chemin (sans hash) pour Meta
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // GA : on peut garder le hash (plus précis côté reporting)
    const gaPath = location.pathname + location.search + location.hash;

    // META : on ignore le hash pour éviter les doublons /create-pitch -> /create-pitch#
    const metaPath = location.pathname + location.search;

    // ---- Google Analytics ----
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: gaPath });
    }

    // ---- Meta Pixel ----
    if (typeof window.fbq === "function") {
      // 1er rendu : NE PAS tirer (le snippet index.html a déjà envoyé 1 PageView)
      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = metaPath;
        // console.log(`[Meta] initial path registered: ${metaPath}`);
        return;
      }

      // Changement réel de page (en ignorant le hash) -> tirer un PageView
      if (window.__lastMetaPVPath !== metaPath) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = metaPath;
        // console.log(`[Meta] PageView (SPA nav): ${metaPath}`);
      }
    } else {
      console.warn("Meta Pixel (fbq) is not available.");
    }
  }, [location]);

  return null;
}
