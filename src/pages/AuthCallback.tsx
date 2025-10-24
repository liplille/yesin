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
      const originalHref = window.location.href;

      // Nettoyage visuel de l'URL (enlève le hash)
      const cleanPath = window.location.pathname + window.location.search;
      if (window.location.hash) {
        try {
          history.replaceState(null, "", cleanPath);
        } catch {}
      }
      window.__lastMetaPVPath = cleanPath; // évite PV en double

      try {
        await supabase.auth.exchangeCodeForSession(originalHref);
        // 👉 Flag pour CreatePitch : on vient bien d’un lien magique
        sessionStorage.setItem("cameFromMagic", "1");
      } catch (e) {
        console.error("[AuthCallback] exchangeCodeForSession", e);
      } finally {
        const params = new URLSearchParams(location.search);
        const next = params.get("next") || "/";
        navigate(next, { replace: true });
      }
    })();
  }, [location.search, navigate]);

  return null;
}
