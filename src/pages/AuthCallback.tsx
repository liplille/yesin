// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

declare global {
  interface Window {
    __lastMetaPVPath?: string;
  }
}

function parseHashTokens(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const p = new URLSearchParams(h);

  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");

  if (access_token && refresh_token) {
    return { access_token, refresh_token };
  }
  return null;
}

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let safetyTimer = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 8000);

    (async () => {
      const href = window.location.href;

      // Dernière URL vue côté tracking
      const cleanPath = window.location.pathname + window.location.search;
      window.__lastMetaPVPath = cleanPath;

      const params = new URLSearchParams(location.search);
      let next = params.get("next") || "/";
      if (!next.startsWith("/")) next = "/";

      const leadId =
        params.get("lead_id") || sessionStorage.getItem("presenceLeadId");

      try {
        const url = new URL(href);
        const hasCode = url.searchParams.has("code");

        let session: any = null;

        // 1) PKCE flow
        if (hasCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            href
          );
          if (error) throw error;
          session = data?.session ?? null;
        } else {
          // 2) Implicit flow
          const tokens = parseHashTokens(window.location.hash);
          if (tokens) {
            const { data, error } = await supabase.auth.setSession(tokens);
            if (error) throw error;
            session = data?.session ?? null;
          }
        }

        // 3) Fallback
        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data?.session ?? null;
        }

        if (!session) {
          console.error("[AuthCallback] No session obtained.");
          navigate("/thank-you?mode=check-email", { replace: true });
          return;
        }

        // Nettoyage du hash
        if (window.location.hash) {
          try {
            history.replaceState(null, "", cleanPath);
          } catch {}
        }

        sessionStorage.setItem("cameFromMagic", "1");

        // 4) Finalize lead
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

          if (!r.ok) {
            const txt = await r.text().catch(() => "");
            console.error("[AuthCallback] finalize_lead failed", r.status, txt);
          }
        }

        navigate(next, { replace: true });
      } catch (err) {
        console.error("[AuthCallback] error:", err);
        navigate("/", { replace: true });
      } finally {
        clearTimeout(safetyTimer);
      }
    })();

    return () => clearTimeout(safetyTimer);
  }, [location.search, navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg text-fg z-50">
      <div className="rounded-3xl border border-black/10 bg-white/5 p-6 shadow-xl dark:border-white/10 max-w-sm w-full mx-4">
        <div className="text-lg font-extrabold text-center">
          Validation en cours…
        </div>
        <div className="mt-2 text-sm opacity-75 text-center">
          Nous confirmons votre accès puis vous redirigeons.
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      </div>
    </div>
  );
}
