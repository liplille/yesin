import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  CheckCircleIcon,
  PlayIcon,
  MicrophoneIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";

// --- HELPERS ---
function asString(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtDateFR(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function DirectoryProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate(); // Déplacé à l'intérieur du composant

  const [row, setRow] = useState<any>(null);
  const [audioRow, setAudioRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      const { data: snap } = await supabase
        .from("ai_site_snapshots")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (snap) {
        setRow(snap);
        const { data: audio } = await supabase
          .from("directory_services")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (audio) setAudioRow(audio);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const data = useMemo(() => {
    if (!row) return null;

    const s =
      typeof row.snapshot === "string"
        ? JSON.parse(row.snapshot)
        : row.snapshot || {};
    const norm = s.normalization || {};
    const vp = s.value_proposition || {};
    const trust = s.trust_and_coherence || {};
    const rec = s.ai_recommendation || {};

    const trustScorePct = clamp(row.ai_readiness_score || 0, 0, 10) * 10;
    const potentialGain = clamp(100 - trustScorePct, 15, 25);
    const targetScore = Math.min(100, trustScorePct + potentialGain);

    return {
      name:
        asString(norm.title) ||
        asString(s.identification?.entity_name) ||
        row.domain,
      category: asString(norm.primary_category, "Secteur professionnel"),
      trustScore: trustScorePct,
      targetScore: targetScore,
      scoreJustification: asString(s.ai_readiness?.justification),
      reliabilityReason: asString(trust.reliability_reason),
      date: fmtDateFR(row.created_at),
      url: row.external_url,
      audioUrl: audioRow?.audio_url || null,
      tags: asStringArray(norm.tags),
      description: asString(vp.offer_description),
      differentiation: asString(s.differentiation?.summary),
      targetAudience: asString(vp.target_audience),
      useCases: asStringArray(rec.use_cases),
      faqVerified: (norm.faq_verified || []).map((f: any) => ({
        question: asString(f.question),
        answer: asString(f.answer),
      })),
      faqGaps: (norm.faq_gaps || []).map((g: any) => ({
        question: asString(g.question),
        missing_info: asString(g.missing_info),
      })),
      pointsFlous: [
        ...asStringArray(rec.limits),
        ...asStringArray(trust.coherence_issues),
      ].filter((x) => x && x !== "aucun signal explicite"),
      pricing: s.pricing || {},
    };
  }, [row, audioRow]);

  const handleRandomProfile = async () => {
    // 1. On récupère une liste de plusieurs slugs publiés (ex: 20 derniers)
    // pour avoir du choix, tout en excluant le site actuel
    const { data: profiles } = await supabase
      .from("ai_site_snapshots")
      .select("slug")
      .eq("is_published", true)
      .neq("slug", slug)
      .limit(20);

    if (profiles && profiles.length > 0) {
      // 2. On choisit un index au hasard parmi les résultats retournés
      const randomIndex = Math.floor(Math.random() * profiles.length);
      const randomSlug = profiles[randomIndex].slug;

      // 3. On navigue vers ce nouveau slug
      navigate(`/profil/${randomSlug}`);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center opacity-50 uppercase text-[10px] tracking-widest text-fg">
        Synchronisation algorithmique...
      </div>
    );

  if (!data)
    return (
      <div className="p-20 text-center text-sm opacity-50 text-fg">
        Profil introuvable.
      </div>
    );

  return (
    <div className="min-h-screen bg-bg text-fg pb-32 font-sans selection:bg-primary/30">
      <main className="mx-auto max-w-2xl px-6 pt-16">
        {/* BARRE D'ACTIONS RAPIDES */}
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={handleRandomProfile}
            className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center gap-2 transition-all"
          >
            <ArrowPathIcon className="h-3 w-3" /> Explorer un autre site
          </button>

          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            Visiter le site <ArrowRightIcon className="h-3 w-3" />
          </a>
        </div>

        {/* HEADER & TAGS */}
        <header className="mb-16 text-center">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {data.category}
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-6 leading-[0.9]">
            {data.name}
            <span className="text-primary">.</span>
          </h1>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {data.tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-fg/5 rounded-full text-[10px] font-bold opacity-60 uppercase tracking-wider"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-xs opacity-40 font-medium uppercase tracking-widest">
            Indexé le {data.date}
          </p>
        </header>

        {/* SCORE INTERACTIF */}
        <section className="mb-20">
          <div className="bg-white/5 border border-black/5 dark:border-white/10 rounded-[40px] p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">
                    Score IA
                  </p>
                  <div className="text-5xl font-black tracking-tighter">
                    {data.trustScore}%
                  </div>
                </div>
                <div className="h-12 w-px bg-fg/10" />
                <div className="text-center text-primary">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">
                    Potentiel Vocal
                  </p>
                  <div className="text-5xl font-black tracking-tighter flex items-center italic">
                    {data.targetScore}%{" "}
                    <ArrowUpIcon className="h-6 w-6 ml-1 animate-bounce" />
                  </div>
                </div>
              </div>
              <p className="text-xs opacity-70 max-w-sm mx-auto leading-relaxed border-t border-white/5 pt-4 italic">
                "{data.scoreJustification}"
              </p>
            </div>
          </div>
        </section>

        {/* ANALYSE DÉTAILLÉE */}
        <div className="space-y-20">
          <section>
            <div className="flex items-center gap-3 mb-6 font-black uppercase text-[10px] tracking-widest opacity-40 text-fg">
              <MagnifyingGlassIcon className="h-4 w-4 text-primary" />
              <h3>Interprétation de vos services</h3>
            </div>
            <div className="bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-primary mb-2">
                  Description
                </p>
                <p className="text-sm opacity-90 leading-relaxed font-medium">
                  {data.description}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-primary mb-2">
                  Différenciation
                </p>
                <p className="text-sm opacity-90 leading-relaxed font-medium">
                  {data.differentiation}
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-start gap-3">
                <UserGroupIcon className="h-5 w-5 shrink-0 text-primary/50" />
                <div>
                  <p className="text-[10px] font-black uppercase mb-1">
                    Audience Cible
                  </p>
                  <p className="text-xs font-bold opacity-70">
                    {data.targetAudience}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* OPPORTUNITÉS IA */}
          <section>
            <div className="flex items-center gap-3 mb-6 font-black uppercase text-[10px] tracking-widest opacity-40 text-fg">
              <SparklesIcon className="h-4 w-4 text-primary" />
              <h3>Scénarios de recommandation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.useCases.map((uc, i) => (
                <div
                  key={i}
                  className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3 group hover:bg-primary/10 transition-colors text-fg"
                >
                  <CheckCircleIcon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold opacity-80">{uc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* LIMITES */}
          <section>
            <div className="flex items-center gap-3 mb-6 font-black uppercase text-[10px] tracking-widest text-amber-500">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <h3>Limites Algorithmiques</h3>
            </div>
            <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-3xl p-8 text-fg">
              <p className="text-[10px] font-black text-amber-600 mb-6 uppercase tracking-wider italic opacity-70">
                L'IA hésite sur les points suivants :
              </p>
              <ul className="space-y-4">
                {[
                  ...data.pointsFlous,
                  ...data.faqGaps.map((g) => g.question),
                ].map((pt, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-sm opacity-80 border-b border-amber-500/5 pb-4 last:border-0 font-medium"
                  >
                    <div className="h-5 w-5 rounded-full bg-amber-500/10 shrink-0 flex items-center justify-center text-[10px] font-bold italic text-amber-600">
                      ?
                    </div>
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex gap-3 items-center">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                <p className="text-[11px] font-bold opacity-80 text-green-700">
                  {data.reliabilityReason}
                </p>
              </div>
            </div>
          </section>

          {/* LE PIVOT (CONVERSION) */}
          <section className="relative group text-center">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[40px] blur opacity-25" />
            <div className="relative bg-white dark:bg-[#0c0c0c] border border-primary/20 rounded-[32px] p-10 shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest mb-8 animate-pulse">
                <SparklesIcon className="h-3 w-3" /> Diffusion Publicitaire
                Gratuite Offerte
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight text-fg">
                Devenez une source certifiée.
              </h2>
              <p className="text-sm opacity-70 mb-10 leading-relaxed max-w-lg mx-auto text-fg">
                En enregistrant un pitch, vous remplacez les suppositions de
                l'IA par des certitudes. Votre message sera diffusé sur notre
                réseau pub en bonus.
              </p>

              <button
                onClick={() =>
                  data.audioUrl && window.open(data.audioUrl, "_blank")
                }
                className="w-full h-16 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <MicrophoneIcon className="h-5 w-5" /> Enregistrer & Booster mon
                score
              </button>

              {!data.audioUrl && (
                <div className="mt-10 pt-10 border-t border-black/10 text-left">
                  <div className="flex items-center gap-2 mb-6">
                    <SparklesIcon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      L'art du Pitch
                    </span>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-black tracking-tight mb-3 text-fg">
                        Le pitch est une{" "}
                        <span className="text-primary italic">
                          poignée de main
                        </span>{" "}
                        vocale.
                      </h3>
                      <p className="text-sm leading-relaxed opacity-70 font-medium max-w-xl text-fg">
                        Oubliez le jargon technique. L'idée est de créer un
                        déclic humain en répondant simplement à trois questions
                        :<strong> Qui </strong> aidez-vous ?
                        <strong> Quel </strong> problème réglez-vous ?
                        <strong> Pourquoi </strong> vous faire confiance ?
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 max-w-xl text-fg">
                      <p className="text-[10px] font-black uppercase mb-2 text-primary tracking-widest italic flex items-center gap-2">
                        <MicrophoneIcon className="h-3 w-3" /> Le conseil du pro
                      </p>
                      <p className="text-xs italic leading-relaxed font-semibold opacity-90">
                        "Parlez avec le sourire. On ne le voit pas, mais il
                        s'entend : un sourire au micro brise instantanément la
                        glace et installe une confiance immédiate avec votre
                        auditeur."
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* FAQ & TECHNIQUE */}
          <footer className="space-y-16 opacity-60 border-t border-white/10 pt-16">
            <section>
              <div className="flex items-center gap-3 mb-6 font-black uppercase text-[10px] tracking-widest text-fg">
                <ArrowPathIcon className="h-4 w-4" />
                <h3>Faits vérifiés sur le site</h3>
              </div>
              <div className="space-y-4 mb-8">
                {data.faqVerified.map((f, i) => (
                  <div
                    key={i}
                    className="p-6 bg-white/5 rounded-2xl border border-white/5 text-fg"
                  >
                    <p className="text-sm font-black mb-2">{f.question}</p>
                    <p className="text-sm opacity-70 leading-relaxed">
                      {f.answer}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-fg">
                <p className="text-xs font-black uppercase opacity-40 mb-2 tracking-widest">
                  Tarification & Modèle
                </p>
                <p className="text-sm font-bold">
                  {data.pricing?.detected === false
                    ? "Non identifiable sur les pages publiques"
                    : data.pricing?.range_estimated}
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 text-center">
                <p className="text-[10px] font-bold uppercase opacity-40 tracking-[0.2em] text-fg">
                  Source officielle analysée
                </p>
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-black text-primary hover:underline transition-all"
                >
                  {data.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            </section>

            <div className="text-center text-[9px] font-black uppercase tracking-[0.4em] opacity-20 text-fg">
              {row.model_name} • Analyzer v{row.analyzer_version}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
