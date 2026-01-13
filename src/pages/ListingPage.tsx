// src/pages/ListingPage.tsx
import { supabase } from "../lib/supabaseClient";
import { useGeoAddress } from "../hooks/useGeoAddress";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { RootOutletContext } from "../layout/RootLayout";
import {
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/solid";

// --------------------
// Branding
// --------------------
const PRESENCE_NAME = "YesIn Presence™";
const VOICE_NAME = "YesIn Voice™";
const PRESENCE_LABEL = "Publicité IA";

// --------------------
// Helpers
// --------------------
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function normalizeIdentifier(input: string) {
  const v = input.trim();
  if (!v) return "";
  return v;
}

function getTonightMidnightMs() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(now.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime();
}

function formatLocalMidnightLabel() {
  return "ce soir minuit";
}

type UTM = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
};

// --------------------
// Component
// --------------------
export default function ListingPage() {
  const [loading, setLoading] = useState(false);
  const { address } = useGeoAddress({ autoLocateOnMount: true });
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useOutletContext<RootOutletContext>();

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // --- Pricing ---
  const PRICE_EUR = 24.99;

  // --- Urgence : deadline = minuit ---
  const LS_DEADLINE_KEY = "yesin_presence_midnight_v1";
  const LS_SPOTS_KEY = "yesin_presence_spots_v1";

  const [deadlineMs, setDeadlineMs] = useState<number>(() => {
    const now = Date.now();
    const tonight = getTonightMidnightMs();

    const raw = localStorage.getItem(LS_DEADLINE_KEY);
    const parsed = raw ? Number(raw) : NaN;

    if (Number.isFinite(parsed) && parsed > now && parsed <= tonight) {
      return parsed;
    }

    localStorage.setItem(LS_DEADLINE_KEY, String(tonight));
    return tonight;
  });

  const [spots, setSpots] = useState<number>(() => {
    const raw = localStorage.getItem(LS_SPOTS_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const initial = 37;
    localStorage.setItem(LS_SPOTS_KEY, String(initial));
    return initial;
  });

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (session) {
      navigate("/create-pitch", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Si on dépasse minuit pendant la session : recalcul
  useEffect(() => {
    if (nowMs > deadlineMs) {
      const tonight = getTonightMidnightMs();
      localStorage.setItem(LS_DEADLINE_KEY, String(tonight));
      setDeadlineMs(tonight);
    }
  }, [nowMs, deadlineMs]);

  const remainingSec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  const hh = Math.floor(remainingSec / 3600);
  const mm = Math.floor((remainingSec % 3600) / 60);
  const ss = remainingSec % 60;

  const windowOpen = remainingSec > 0;
  const last10min = windowOpen && remainingSec <= 10 * 60;

  // Effet “batch”
  useEffect(() => {
    if (!windowOpen) return;
    if (remainingSec === 0) return;

    if (remainingSec % 41 === 0) {
      setSpots((s) => {
        const next = Math.max(6, s - 1);
        localStorage.setItem(LS_SPOTS_KEY, String(next));
        return next;
      });
    }
  }, [remainingSec, windowOpen]);

  const priceLabel = useMemo(() => {
    if (windowOpen) return "0€ maintenant";
    return `${PRICE_EUR.toFixed(2).replace(".", ",")}€`;
  }, [windowOpen]);

  // --- Query params: prefill + utm + locks ---
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const lockEmail = query.get("lock_email") === "1";
  const lockSite = query.get("lock_site") === "1";

  useEffect(() => {
    // Prefill
    const qpEmail = query.get("email");
    const qpSite = query.get("site");

    if (qpEmail && !email) setEmail(qpEmail);
    if (qpSite && !identifier) setIdentifier(qpSite);

    // UTM -> sessionStorage
    const utm: UTM = {
      source: query.get("utm_source"),
      medium: query.get("utm_medium"),
      campaign: query.get("utm_campaign"),
      content: query.get("utm_content"),
      term: query.get("utm_term"),
    };

    if (Object.values(utm).some(Boolean)) {
      sessionStorage.setItem("presenceUTM", JSON.stringify(utm));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // volontairement sans email/identifier pour éviter boucle

  const handleStart = async () => {
    if (loading) return; // anti double-submit
    setError(null);

    const id = normalizeIdentifier(identifier);
    if (!id) return setError("Entre ton site web pour démarrer.");
    if (!email) return setError("Entre ton email pour continuer.");

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) return setError("Entre un email valide.");

    // Stockage pour la suite du tunnel
    sessionStorage.setItem("presenceIdentifier", id);
    sessionStorage.setItem("presenceEmail", email);
    sessionStorage.setItem("presenceWindowOpen", windowOpen ? "1" : "0");
    sessionStorage.setItem("presenceSourcePage", "/presence");

    const next = "/create-pitch";

    // Si déjà connecté -> go direct
    if (session) {
      navigate(next);
      return;
    }

    setLoading(true);
    try {
      const utmRaw = sessionStorage.getItem("presenceUTM");
      const utm = utmRaw ? JSON.parse(utmRaw) : null;

      // 1) Capture lead (Edge Function)
      const capRes = await fetch(
        "https://iylpizhkwuybdxrcvsat.supabase.co/functions/v1/capture_lead",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            site: id,
            source_page: "/presence",
            geo: address, // si tu veux, on branche useGeoAddress ici
            utm,
          }),
        }
      );

      const capJson = await capRes.json().catch(() => ({}));
      if (!capRes.ok) {
        console.error("capture_lead error", capRes.status, capJson);
        throw new Error(
          capJson?.error || `capture_lead failed (${capRes.status})`
        );
      }

      const leadId = capJson.lead_id;
      sessionStorage.setItem("presenceLeadId", leadId);

      // 2) callback Supabase -> AuthCallback redirige ensuite vers next
      const callback =
        `${window.location.origin}/auth/callback` +
        `?next=${encodeURIComponent(next)}` +
        `&lead_id=${encodeURIComponent(leadId)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callback },
      });

      if (error) throw error;

      // 3) Page "allez voir votre email"
      navigate("/thank-you?mode=check-email");
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg text-fg">
      {/* HERO */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 py-12 lg:grid-cols-2">
        {/* LEFT */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/5 px-3 py-1 text-xs font-semibold opacity-90 dark:border-white/10">
            <SparklesIcon className="h-4 w-4 text-primary" />
            {PRESENCE_LABEL} · {PRESENCE_NAME}
          </div>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
            Faites connaître votre activité dans les{" "}
            <span className="text-primary">réponses des IA</span>.
          </h1>

          <p className="mt-4 max-w-xl text-lg opacity-80">
            Les IA deviennent un nouveau canal de publicité. Avec{" "}
            {PRESENCE_NAME}, vous mettez en avant votre activité et nous la
            transformons en message clair que les assistants IA (Gemini,
            ChatGPT, Claude, Perplexity) peuvent recommander quand quelqu’un
            vous cherche.
          </p>

          <ul className="mt-6 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: MagnifyingGlassIcon,
                title: "Plus de visibilité",
                desc: "Votre activité est plus souvent recommandée.",
              },
              {
                icon: CheckCircleIcon,
                title: "Simple & rapide",
                desc: "Vous entrez votre site → nous vous guidons pas à pas.",
              },
              {
                icon: ShieldCheckIcon,
                title: "Plus rassurant",
                desc: "Nous mettons en avant les preuves, avis et garanties.",
              },
              {
                icon: MicrophoneIcon,
                title: VOICE_NAME,
                desc: "Votre message audio rend votre activité plus mémorable.",
              },
            ].map((b, i) => (
              <li
                key={`${b.title}-${i}`}
                className="rounded-2xl border border-black/10 bg-white/5 p-4 shadow-sm dark:border-white/10"
              >
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-semibold">{b.title}</div>
                <div className="mt-1 text-sm opacity-75">{b.desc}</div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleStart}
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-extrabold text-white shadow-xl hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "Envoi du lien..."
                : "Créer mon accès et activer ma pub IA →"}
            </button>

            <a
              href="#promesse"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10 dark:border-white/10"
            >
              Comprendre en 30 sec
            </a>
          </div>

          <p className="mt-4 text-xs opacity-60">
            Note : personne ne peut garantir une place précise dans une IA. Nous
            identifions et structurons les informations essentielles pour que
            votre activité soit mieux comprise et plus facilement recommandée.
            Et nous le faisons efficacement : nos clients constatent déjà plus
            de visibilité et plus de contacts.
          </p>
        </div>

        {/* RIGHT (CTA) */}
        <aside className="rounded-3xl border border-black/10 bg-white/5 p-6 shadow-2xl dark:border-white/10">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-primary/90">
                {PRESENCE_LABEL} · activation
              </div>
              <div className="mt-1 text-2xl font-extrabold">{priceLabel}</div>
              <div className="mt-1 text-xs opacity-70">
                {windowOpen ? (
                  <>
                    Après minuit :{" "}
                    <span className="font-semibold">
                      {PRICE_EUR.toFixed(2).replace(".", ",")}€
                    </span>
                  </>
                ) : (
                  <>
                    Fenêtre expirée · Tarif standard{" "}
                    <span className="font-semibold">
                      {PRICE_EUR.toFixed(2).replace(".", ",")}€
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* TIMER */}
            <div
              className={`w-full sm:w-auto rounded-2xl border px-4 py-3 text-center shadow-lg ${
                windowOpen
                  ? "border-primary/30 bg-primary/10"
                  : "border-red-500/30 bg-red-500/10"
              } ${last10min ? "animate-pulse" : ""}`}
              aria-live="polite"
              title="Temps restant jusqu’à minuit"
            >
              <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-80">
                <ClockIcon
                  className={`h-4 w-4 ${
                    windowOpen ? "text-primary" : "text-red-400"
                  }`}
                />
                Offre jusqu’à{" "}
                <span className="text-primary">
                  {formatLocalMidnightLabel()}
                </span>
              </div>

              <div className="mt-1 tabular-nums text-xl sm:text-2xl font-black">
                {pad2(hh)}:{pad2(mm)}:{pad2(ss)}
              </div>

              <div className="mt-1 text-[11px] opacity-75">
                Ensuite :{" "}
                <span className="font-semibold">
                  {PRICE_EUR.toFixed(2).replace(".", ",")}€
                </span>
              </div>
            </div>
          </div>

          {/* PROMESSE courte */}
          <div className="mt-4 rounded-2xl border border-black/10 bg-bg/20 p-4 text-sm dark:border-white/10 dark:bg-black/20">
            <div className="font-semibold">
              Faites connaître votre activité pour être{" "}
              <span className="text-primary">recommandée par les IA</span>.
            </div>
            <div className="mt-1 text-xs opacity-75">
              Vous entrez votre site, vous finalisez votre inscription, et nous
              structurons vos informations pour qu’elles soient comprises par
              les IA. Votre accès est créé immédiatement.
            </div>
          </div>

          {/* URGENCE */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-lg">⚡</span> Fenêtre de lancement
              <span className="text-xs font-normal opacity-80">
                (jusqu’à {formatLocalMidnightLabel()})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  spots <= 10
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-black/10 bg-white/5 dark:border-white/10"
                }`}
              >
                🎯 {spots} activations restantes
              </span>

              <span className="rounded-full border border-black/10 bg-white/5 px-3 py-1 text-[11px] font-semibold dark:border-white/10">
                Mise en ligne prioritaire
              </span>
            </div>
          </div>

          {/* FORM */}
          <div className="mt-4 rounded-3xl border border-primary/35 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-40"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400"></span>
              </span>

              <span>
                Pour lancer votre{" "}
                <span className="text-primary">publicité IA</span>
              </span>
            </div>

            <div className="text-xs opacity-75">
              2 infos rapides, nous nous occupons du reste.
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {/* ACTIVITÉ */}
              <div>
                <label className="text-xs font-semibold opacity-80">
                  Votre activité
                </label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  readOnly={lockSite}
                  placeholder="votre-site.fr"
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-bg/30 px-4 py-4 text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-white/60 focus:ring-4 focus:ring-primary/25 dark:border-white/10 dark:bg-black/20"
                  autoComplete="off"
                />
                <div className="mt-1 text-[11px] opacity-70">
                  → Sert à identifier votre activité et créer votre message
                  publicitaire.
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-xs font-semibold opacity-80">
                  Votre email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={lockEmail}
                  type="email"
                  placeholder="Votre email professionnel"
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-bg/30 px-4 py-4 text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-white/60 focus:ring-4 focus:ring-primary/25 dark:border-white/10 dark:bg-black/20"
                  autoComplete="email"
                />
                <div className="mt-1 text-[11px] opacity-70">
                  → Sert à créer votre accès et vous envoyer la suite.
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleStart}
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-extrabold text-white shadow-xl hover:opacity-90 disabled:opacity-60"
              >
                {loading
                  ? "Envoi du lien..."
                  : "Créer mon accès et activer ma pub IA →"}
              </button>

              {error && <div className="text-sm text-red-400">{error}</div>}
            </div>
          </div>
        </aside>
      </section>

      {/* PROMESSE */}
      <section
        id="promesse"
        className="bg-primary/5 py-20 border-y border-primary/10"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Votre activité devient une{" "}
              <span className="text-primary">recommandation prioritaire</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg opacity-80 italic">
              "Nous transformons votre activité en message publicitaire que les
              IA peuvent recommander à leurs utilisateurs."
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                t: "Compréhension de votre activité",
                d: "Nous identifions clairement ce que vous faites pour vous faire apparaître dans les bonnes recherches.",
                icon: "🧠",
                label: "Clarté",
              },
              {
                step: "02",
                t: "Crédibilité par la voix",
                d: "Votre message audio rassure et donne envie de vous recommander.",
                icon: "🎙️",
                label: "Confiance",
              },
              {
                step: "03",
                t: "Mise en avant sur les IA",
                d: "Grâce à notre expertise, votre activité est présentée de la bonne manière pour être mieux comprise et plus souvent recommandée.",
                icon: "🚀",
                label: "Visibilité",
              },
              {
                step: "04",
                t: "Plus de visibilité et de clients",
                d: "Votre activité gagne en demandes, en visites et en opportunités de vente.",
                icon: "📈",
                label: "Résultats",
              },
            ].map((x, i) => (
              <div
                key={`${x.t}-${i}`}
                className="relative group rounded-3xl border border-black/10 bg-card p-6 shadow-xl transition-all hover:-translate-y-1 dark:border-white/10"
              >
                <div className="absolute -top-3 -left-3 h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/30">
                  {x.step}
                </div>

                <div className="text-3xl mb-4">{x.icon}</div>

                <div className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase mb-3 tracking-widest">
                  {x.label}
                </div>

                <h3 className="text-lg font-bold mb-3">{x.t}</h3>
                <p className="text-xs leading-relaxed opacity-70">{x.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { t: "Commerces", v: "Plus de visites en point de vente" },
              { t: "Entreprises", v: "Meilleure visibilité commerciale" },
              { t: "Événements", v: "Plus de participants potentiels" },
              { t: "Créateurs", v: "Audience qui grandit" },
            ].map((b, i) => (
              <div
                key={`${b.t}-${i}`}
                className="text-center p-4 rounded-2xl border border-black/5 bg-white/5"
              >
                <div className="text-primary font-bold text-sm">{b.t}</div>
                <div className="text-[10px] opacity-60 uppercase">{b.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={handleStart}
              disabled={loading}
              className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 font-black text-white shadow-2xl hover:scale-105 transition-all disabled:opacity-60"
            >
              🚀 ACTIVER MA PUBLICITÉ IA
              <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold md:text-3xl">FAQ</h2>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4">
          {[
            {
              q: "Est-ce que c’est compliqué à mettre en place ?",
              a: "Non. Vous entrez simplement votre site, puis vous complétez quelques informations utiles sur votre activité. Nous structurons ensuite ces éléments pour qu’ils soient compris par les IA.",
            },
            {
              q: "Est-ce que vous garantissez des résultats immédiats ?",
              a: "Non, comme pour toute action de communication, les résultats ne sont jamais garantis ni instantanés. En revanche, notre expertise permet de présenter votre activité de la bonne manière pour augmenter durablement vos chances d’être recommandé.",
            },
            {
              q: "En quoi êtes-vous différents d’un simple annuaire ?",
              a: "Nous ne faisons pas que lister votre activité. Nous organisons vos informations comme une véritable fiche publicitaire pensée pour les IA, afin qu’elles puissent mieux comprendre ce que vous faites et à qui vous vous adressez.",
            },
            {
              q: "Pourquoi y a-t-il un décompte et un nombre d’activations ?",
              a: "Nous ouvrons l’accès par vagues pour accompagner correctement chaque nouveau compte et assurer une mise en place de qualité. Après cette phase de lancement, l’activation repasse au tarif standard.",
            },
            {
              q: "À quoi sert exactement mon email ?",
              a: "Votre email sert uniquement à créer votre accès et à vous permettre de poursuivre l’inscription.",
            },
          ].map((item, i) => (
            <details
              key={`${item.q}-${i}`}
              className="group rounded-2xl border border-black/10 bg-white/5 p-5 dark:border-white/10"
            >
              <summary className="cursor-pointer list-none font-semibold">
                {item.q}
              </summary>
              <p className="mt-2 text-sm opacity-80">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
