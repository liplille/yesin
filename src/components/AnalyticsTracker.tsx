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
    __lastMetaPVPath?: string;
    __lastMetaPVTime?: number;
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const gaPath = location.pathname + location.search + location.hash;
    const metaPath = location.pathname + location.search;

    // GA : OK à chaque nav SPA
    window.gtag?.("event", "page_view", { page_path: gaPath });

    // ❌ Ne jamais tirer de PageView Meta sur /auth/callback
    if (metaPath.startsWith("/auth/callback")) return;

    if (window.fbq) {
      const now = Date.now();

      // 1er rendu : on initialise seulement
      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
        return;
      }

      const pathChanged = window.__lastMetaPVPath !== metaPath;
      const tooSoon = now - (window.__lastMetaPVTime || 0) < 800; // anti-rebond soft

      if (pathChanged && !tooSoon) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
      }
    }
  }, [location]);

  return null;
}
