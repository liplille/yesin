// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

declare global {
  interface Window {
    gtag?: (cmd: string, action: string, params?: Record<string, any>) => void;
    fbq?: (...args: any[]) => void;
    // __lastMetaPVPath n'est plus nécessaire ici
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const { session, loading } = useAuth(); // On utilise toujours session et loading

  useEffect(() => {
    // 1. Attendre que l'état d'authentification soit chargé
    if (loading) {
      return; // Ne rien faire tant que l'état auth n'est pas finalisé
    }

    // 2. Préparer les chemins
    const gaPath = location.pathname + location.search + location.hash;
    const metaPath = location.pathname + location.search; // On ignore le hash pour Meta

    // 3. Google Analytics (exclure /auth/callback si souhaité)
    if (!metaPath.startsWith("/auth/callback")) {
      window.gtag?.("event", "page_view", { page_path: gaPath });
    }

    // 4. Meta Pixel Logic (maintenant gère aussi l'initial)
    if (!window.fbq) return;
    if (metaPath.startsWith("/auth/callback")) return; // Exclure le callback

    // 5. Déterminer si on doit skipper le PageView pour Meta
    const isHomePage = metaPath === "/";
    // Utiliser startsWith pour /welcome au cas où il y aurait des paramètres
    const isWelcomePage = metaPath.startsWith("/welcome");
    const shouldSkipMetaPageView = session && (isHomePage || isWelcomePage);

    // 6. Envoyer le PageView à Meta si on ne doit PAS le skipper
    if (!shouldSkipMetaPageView) {
      window.fbq("track", "PageView");
      console.log(`AnalyticsTracker: Meta PageView envoyé pour ${metaPath}`); // Pour débogage
    } else {
      console.log(
        `AnalyticsTracker: Meta PageView SKIPPÉ pour ${metaPath} (connecté)`
      ); // Pour débogage
    }

    // Ce hook s'exécute à chaque changement de location OU quand loading passe à false
  }, [location, session, loading]);

  return null;
}
