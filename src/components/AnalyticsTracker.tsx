// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider"; // Garder l'import

declare global {
  interface Window {
    gtag?: (cmd: string, action: string, params?: Record<string, any>) => void;
    fbq?: (...args: any[]) => void;
    __lastMetaPVPath?: string;
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const { session, loading } = useAuth(); // <-- Récupérer aussi 'loading'

  useEffect(() => {
    // --- NOUVELLE CONDITION ---
    // Attendre que l'état d'authentification soit chargé avant de faire quoi que ce soit
    if (loading) {
      return; // Ne rien faire si l'état auth est en cours de détermination
    }
    // --- FIN NOUVELLE CONDITION ---

    // GA : on inclut le hash
    const gaPath = location.pathname + location.search + location.hash;
    window.gtag?.("event", "page_view", { page_path: gaPath });

    // Meta : on ignore le hash
    const metaPath = location.pathname + location.search;

    // ---- Meta Pixel ----
    if (!window.fbq) return;
    if (metaPath.startsWith("/auth/callback")) return;

    // Premier rendu : on ne tire pas (déjà tiré par index.html)
    if (!window.__lastMetaPVPath) {
      window.__lastMetaPVPath = metaPath;
      return;
    }

    // Navigation réelle → tirer un PageView, sauf exceptions
    if (window.__lastMetaPVPath !== metaPath) {
      const isHomePage = metaPath === "/";
      const isWelcomePage = metaPath === "/welcome";
      // Skip tracking / or /welcome if user is logged in (maintenant que loading est false)
      const shouldSkipMetaPageView = session && (isHomePage || isWelcomePage);

      if (!shouldSkipMetaPageView) {
        window.fbq("track", "PageView");
      }

      window.__lastMetaPVPath = metaPath;
    }
    // Ajouter 'loading' aux dépendances pour ré-exécuter quand il passe à false
  }, [location, session, loading]); // <-- Ajouter 'loading' ici

  return null;
}
