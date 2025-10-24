// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * /auth/callback
 * - Reçoit la redirection de Supabase (magic link / OAuth)
 * - Nettoie l'URL (retire le hash #access_token=... pour éviter 2x PageView)
 * - Échange le code pour une session
 * - Redirige vers ?next=... (ex: /create-pitch) SANS hash
 */
declare global {
  interface Window {
    __lastMetaPVPath?: string;
  }
}

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // 1) Mémorise l'URL complète d'origine (avec hash) pour l'échange Supabase
      const originalHref = window.location.href;

      // 2) Nettoie tout de suite l'URL visible (supprime le hash) pour éviter un second PageView
      const cleanPath = window.location.pathname + window.location.search;
      if (window.location.hash) {
        try {
          history.replaceState(null, "", cleanPath);
        } catch {
          // noop
        }
      }

      // 3) Synchronise le "mémo" Meta pour empêcher tout PageView supplémentaire côté tracker
      window.__lastMetaPVPath = cleanPath;

      try {
        // 4) Échange la session avec l'URL ORIGINALE (qui contient le hash/tokens)
        await supabase.auth.exchangeCodeForSession(originalHref);
      } catch (err) {
        console.error("[AuthCallback] exchangeCodeForSession error:", err);
        // on continue quoi qu'il arrive vers la cible
      } finally {
        // 5) Redirige proprement vers la page finale
        const params = new URLSearchParams(location.search);
        const next = params.get("next") || "/";
        navigate(next, { replace: true });
      }
    })();
  }, [location.search, navigate]);

  // Peut afficher un mini loader si tu veux
  return null;
}
