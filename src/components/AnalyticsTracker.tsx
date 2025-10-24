// src/components/AnalyticsTracker.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string; // petit mémo global
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const hasMountedRef = useRef(false); // pour ignorer le 1er rendu

  useEffect(() => {
    const path = location.pathname + location.search + location.hash;

    // GA: pageview SPA (OK de le garder)
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: path });
    }

    // META Pixel: éviter les doublons
    if (typeof window.fbq === "function") {
      // Ignorer le 1er rendu (le snippet global dans index.html a déjà fait le PageView)
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        window.__lastMetaPVPath = path;
        return;
      }

      // Tirer uniquement si le chemin a changé depuis la dernière fois
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
