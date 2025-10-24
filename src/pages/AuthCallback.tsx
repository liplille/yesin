// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
/**
 * /auth/callback
 * - Reçoit la redirection de Supabase (email magic link)
 * - Échange le code pour une session
 * - Redirige vers ?next=... (ex: /create-pitch) SANS hash
 */
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // v2 : échange l’URL complète (gère code, state, éventuellement un hash si un provider l’ajoute)
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (err) {
        console.error("[AuthCallback] exchangeCodeForSession error:", err);
        // on ne bloque pas la redirection pour autant
      } finally {
        const params = new URLSearchParams(location.search);
        const next = params.get("next") || "/";
        // Redirection propre sans hash et sans ajouter d’historique
        navigate(next, { replace: true });
      }
    })();
  }, [location.search, navigate]);

  // Écran ultra léger pendant l’échange (tu peux le styliser si tu veux)
  return null;
}
