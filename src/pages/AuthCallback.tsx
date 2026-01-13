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
 * - Finalise le lead (lead_id -> user_id + converted_at + upsert leads)
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
        // 1) Echange le code pour une session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          originalHref
        );
        if (error) throw error;

        sessionStorage.setItem("cameFromMagic", "1");

        // 2) Finalize lead (si on a un lead_id)
        const params = new URLSearchParams(location.search);
        const leadId =
          params.get("lead_id") || sessionStorage.getItem("presenceLeadId");

        const accessToken = data?.session?.access_token;

        if (leadId && accessToken) {
          try {
            await fetch(
              "https://iylpizhkwuybdxrcvsat.supabase.co/functions/v1/finalize_lead",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ lead_id: leadId }),
              }
            );
          } catch (e) {
            console.error("[AuthCallback] finalize_lead error:", e);
          }
        }
      } catch (err) {
        console.error("[AuthCallback] exchangeCodeForSession error:", err);
      } finally {
        // Redirect final (inchangé)
        const params = new URLSearchParams(location.search);
        const next = params.get("next") || "/";
        navigate(next, { replace: true });
      }
    })();
  }, [location.search, navigate]);

  return null;
}
