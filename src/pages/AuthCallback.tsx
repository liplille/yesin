// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
      const href = window.location.href;

      console.log("[AuthCallback] href:", href);
      console.log("[AuthCallback] search:", window.location.search);
      console.log("[AuthCallback] hash:", window.location.hash);

      // Nettoyage visuel de l’URL (retire le hash pour éviter un 2e PageView)
      const cleanPath = window.location.pathname + window.location.search;
      if (window.location.hash) {
        try {
          history.replaceState(null, "", cleanPath);
        } catch {}
      }
      window.__lastMetaPVPath = cleanPath;

      const params = new URLSearchParams(location.search);
      const next = params.get("next") || "/";
      const leadId =
        params.get("lead_id") || sessionStorage.getItem("presenceLeadId");

      try {
        const url = new URL(href);
        const hasCode = url.searchParams.has("code");

        let session = null as any;

        if (hasCode) {
          // PKCE flow (code=...)
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            href
          );
          if (error) throw error;
          session = data.session ?? null;
        } else {
          // Implicit flow (tokens dans le hash)
          const { data, error } = await supabase.auth.getSessionFromUrl({
            storeSession: true,
          });
          if (error)
            console.warn("[AuthCallback] getSessionFromUrl error:", error);
          session = data.session ?? null;
        }

        // Fallback: peut déjà être stockée
        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session ?? null;
        }

        if (!session) {
          console.error("[AuthCallback] No session obtained from URL.");
          navigate("/thank-you?mode=check-email", { replace: true });
          return;
        }

        sessionStorage.setItem("cameFromMagic", "1");

        // Finalize lead
        if (leadId) {
          const r = await fetch(
            "https://iylpizhkwuybdxrcvsat.supabase.co/functions/v1/finalize_lead",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ lead_id: leadId }),
            }
          );

          const text = await r.text().catch(() => "");
          if (!r.ok) {
            console.error(
              "[AuthCallback] finalize_lead failed:",
              r.status,
              text
            );
          } else {
            console.log("[AuthCallback] finalize_lead OK:", text);
          }
        } else {
          console.log("[AuthCallback] No leadId to finalize.");
        }

        navigate(next, { replace: true });
      } catch (err) {
        console.error("[AuthCallback] error:", err);
        navigate("/", { replace: true });
      }
    })();
  }, [location.search, navigate]);

  return null;
}
