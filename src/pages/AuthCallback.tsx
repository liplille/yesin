// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

declare global {
  interface Window {
    __lastMetaPVPath?: string;
  }
}

/**
 * /auth/callback
 * - Reçoit la redirection de Supabase (magic link)
 * - Échange le code pour une session
 * - Nettoie l'URL (supprime le hash #access_token=...)
 * - Marque que l'utilisateur vient bien du lien mail (cameFromMagic)
 * - Redirige vers la page finale
 */
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const originalHref = window.location.href;

      // Nettoyage visuel de l’URL (retire le hash pour éviter un 2e PageView)
      const cleanPath = window.location.pathname + window.location.search;
      if (window.location.hash) {
        try {
          history.replaceState(null, "", cleanPath);
        } catch {}
      }

      // Synchronise la dernière URL tracée côté Meta
      window.__lastMetaPVPath = cleanPath;

      try {
        await supabase.auth.exchangeCodeForSession(originalHref);
        sessionStorage.setItem("cameFromMagic", "1");
      } catch (err) {
        console.error("[AuthCallback] exchangeCodeForSession error:", err);
      } finally {
        const params = new URLSearchParams(location.search);
        const next = params.get("next") || "/";
        navigate(next, { replace: true });
      }
    })();
  }, [location.search, navigate]);

  return null;
}
