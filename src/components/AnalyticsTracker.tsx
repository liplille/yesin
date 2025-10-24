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

    // --- 0) IGNORER COMPLETEMENT /auth/callback (aucun PageView Meta/GA) ---
    if (metaPath.startsWith("/auth/callback")) return;

    // --- 1) Si on est sur /welcome ET qu'une session Supabase existe déjà,
    //        alors on NE TRACE PAS cette page (ni GA ni Meta).
    //        On prépare en plus le mémo pour que la prochaine route (ex: /create-pitch)
    //        puisse tracer immédiatement un PageView.
    const isWelcome = metaPath === "/welcome";

    let hasSbSession = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (
          k.startsWith("sb-") &&
          k.endsWith("-auth-token") &&
          localStorage.getItem(k)
        ) {
          hasSbSession = true;
          break;
        }
      }
    } catch {
      /* noop */
    }

    if (isWelcome && hasSbSession) {
      // On "prétend" que le PV a déjà été tiré à cet URL
      window.__lastMetaPVPath = metaPath;
      window.__lastMetaPVTime = Date.now();
      return; // ⛔ ni GA ni Meta ne doivent tracer /welcome
    }

    // --- 2) GA : OK à chaque nav SPA (sauf cas bloqués ci-dessus) ---
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: gaPath });
    }

    // --- 3) META Pixel : anti-doublon + anti-rebond ---
    if (typeof window.fbq === "function") {
      const now = Date.now();

      // Premier passage : initialiser le mémo sans tirer
      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
        return;
      }

      const pathChanged = window.__lastMetaPVPath !== metaPath;
      const tooSoon = now - (window.__lastMetaPVTime || 0) < 800; // antirebond doux

      if (pathChanged && !tooSoon) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
      }
    } else {
      console.warn("Meta Pixel (fbq) is not available.");
    }
  }, [location]);

  return null;
}
