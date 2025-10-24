// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (cmd: string, action: string, params?: Record<string, any>) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string;
    __lastMetaPVTime?: number;
  }
}

function hasSupabaseSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (
        k.startsWith("sb-") &&
        k.endsWith("-auth-token") &&
        localStorage.getItem(k)
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const gaPath = location.pathname + location.search + location.hash;
    const metaPath = location.pathname + location.search;
    const loggedIn = hasSupabaseSession();

    // 0) Pages jamais tracées par Meta/GA
    if (metaPath.startsWith("/auth/callback")) return;

    // 1) Ne JAMAIS tracer /welcome
    if (metaPath === "/welcome") return;

    // 2) Si user connecté, on ne trace pas la home "/" (tu ne veux voir que /create-pitch)
    if (metaPath === "/" && loggedIn) return;

    // 3) GA — OK pour ce qui reste
    window.gtag?.("event", "page_view", { page_path: gaPath });

    // 4) Meta Pixel — anti-doublon + antirebond
    if (window.fbq) {
      const now = Date.now();

      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
        return;
      }

      const pathChanged = window.__lastMetaPVPath !== metaPath;
      const tooSoon = now - (window.__lastMetaPVTime || 0) < 800;

      if (pathChanged && !tooSoon) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
      }
    }
  }, [location]);

  return null;
}
