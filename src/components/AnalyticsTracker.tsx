// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (cmd: string, action: string, params?: Record<string, any>) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string;
  }
}

/**
 * - GA : tire un page_view à chaque navigation SPA
 * - Meta : ignore /auth/callback, ignore le hash, et ne tire pas au 1er rendu (déjà fait via index.html)
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // GA : on inclut le hash
    const gaPath = location.pathname + location.search + location.hash;

    // Meta : on ignore le hash
    const metaPath = location.pathname + location.search;

    // ---- Google Analytics ----
    window.gtag?.("event", "page_view", { page_path: gaPath });

    // ---- Meta Pixel ----
    if (!window.fbq) return;

    // Ne pas tracer /auth/callback
    if (metaPath.startsWith("/auth/callback")) return;

    // Premier rendu : on ne tire pas (déjà tiré par index.html)
    if (!window.__lastMetaPVPath) {
      window.__lastMetaPVPath = metaPath;
      return;
    }

    // Navigation réelle → tirer un PageView
    if (window.__lastMetaPVPath !== metaPath) {
      window.fbq("track", "PageView");
      window.__lastMetaPVPath = metaPath;
    }
  }, [location]);

  return null;
}
