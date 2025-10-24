// src/components/AnalyticsTracker.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

declare global {
  interface Window {
    gtag?: (cmd: string, action: string, params?: Record<string, any>) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string;
    __lastMetaPVTime?: number;
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const { session, loading } = useAuth();
  const didSendInitialRef = useRef(false); // pour GA si besoin

  useEffect(() => {
    // 1) Attendre l'état auth (évite des PV pendant la bascule)
    if (loading) return;

    // 2) Préparer chemins
    const gaPath = location.pathname + location.search + location.hash;
    const metaPath = location.pathname + location.search; // hash ignoré pour Meta

    // 3) Pages à ignorer totalement
    if (metaPath.startsWith("/auth/callback")) return;

    // 4) Règles d'exclusion conditionnelles
    const isWelcome =
      metaPath === "/welcome" || metaPath.startsWith("/welcome?");
    const isHome = metaPath === "/";
    const loggedIn = !!session;

    // — Meta : skip PV si connecté et sur /welcome ou /
    const skipMeta = loggedIn && (isWelcome || isHome);

    // — GA : faire pareil si tu veux un miroir exact
    const skipGA =
      (loggedIn && (isWelcome || isHome)) ||
      metaPath.startsWith("/auth/callback");

    // 5) Google Analytics
    if (!skipGA && typeof window.gtag === "function") {
      // Anti-doublon basique : évite d'envoyer 2x d'affilée le même path dans un même tick
      if (!didSendInitialRef.current || didSendInitialRef.current !== true) {
        window.gtag("event", "page_view", { page_path: gaPath });
        didSendInitialRef.current = true;
      } else {
        // on renvoie quand même sur vrai changement d'URL
        window.gtag("event", "page_view", { page_path: gaPath });
      }
    }

    // 6) Meta Pixel (avec antidoublon & antirebond)
    if (!skipMeta && typeof window.fbq === "function") {
      const now = Date.now();

      // init mémoire si absent
      if (!window.__lastMetaPVPath) {
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
        window.fbq("track", "PageView");
        return;
      }

      const pathChanged = window.__lastMetaPVPath !== metaPath;
      const tooSoon = now - (window.__lastMetaPVTime || 0) < 800; // antirebond doux

      if (pathChanged && !tooSoon) {
        window.fbq("track", "PageView");
        window.__lastMetaPVPath = metaPath;
        window.__lastMetaPVTime = now;
      }
    }
  }, [location, session, loading]);

  return null;
}
