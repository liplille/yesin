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
  // hash attendu: "#access_token=...&refresh_token=...&type=magiclink" etc.
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
    (async () => {
      const href = window.location.href;

      console.log("[AuthCallback] href:", href);
      console.log("[AuthCallback] search:", window.location.search);
      console.log("[AuthCallback] hash:", window.location.hash);

      // Synchronise la dernière URL tracée côté Meta
      const cleanPath = window.location.pathname + window.location.search;
      window.__lastMetaPVPath = cleanPath;

      const params = new URLSearchParams(location.search);
      const next = params.get("next") || "/";
      const leadId =
        params.get("lead_id") || sessionStorage.getItem("presenceLeadId");

      try {
        const url = new URL(href);
        const hasCode = url.searchParams.has("code");

        let session: any = null;

        // 1) PKCE flow (si on a code=...)
        if (hasCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            href
          );
          if (error) throw error;
          session = data?.session ?? null;
        } else {
          // 2) Implicit flow : tokens dans le hash => setSession
          const tokens = parseHashTokens(window.location.hash);
          if (tokens) {
            const { data, error } = await supabase.auth.setSession(tokens);
            if (error) throw error;
            session = data?.session ?? null;
          }
        }

        // 3) Fallback : session peut déjà être stockée
        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data?.session ?? null;
        }

        if (!session) {
          console.error(
            "[AuthCallback] No session obtained. (No code=, no hash tokens, no stored session)"
          );
          navigate("/thank-you?mode=check-email", { replace: true });
          return;
        }

        // Nettoyage visuel de l’URL (retire le hash pour éviter un 2e PageView)
        if (window.location.hash) {
          try {
            history.replaceState(null, "", cleanPath);
          } catch {}
        }

        sessionStorage.setItem("cameFromMagic", "1");

        // 4) Finalize lead
        if (leadId) {
          console.log("[AuthCallback] finalize_lead start", { leadId });

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

          const txt = await r.text().catch(() => "");
          if (!r.ok) {
            console.error("[AuthCallback] finalize_lead failed", r.status, txt);
          } else {
            console.log("[AuthCallback] finalize_lead OK", txt);
          }
        } else {
          console.log("[AuthCallback] No leadId to finalize");
        }

        console.log("[AuthCallback] redirect ->", next);
        navigate(next, { replace: true });
      } catch (err) {
        console.error("[AuthCallback] error:", err);
        navigate("/", { replace: true });
      }
    })();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-fg">
      <div className="rounded-3xl border border-black/10 bg-white/5 p-6 shadow-xl dark:border-white/10">
        <div className="text-lg font-extrabold">Validation en cours…</div>
        <div className="mt-2 text-sm opacity-75">
          Nous confirmons votre accès puis vous redirigeons.
        </div>
        <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      </div>
    </div>
  );
}
