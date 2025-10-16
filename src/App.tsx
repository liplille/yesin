import { useEffect, useRef, useState } from "react";
import "./index.css";

/* === IMPORTS ASSETS (depuis src/assets) === */
import mockupImg from "./assets/images/yesin-app-mockup.png";
import coverBrocante from "./assets/images/cover_brocante.png";
import coverCoiffeur from "./assets/images/cover_coiffeur.png";
import coverRestaurant from "./assets/images/cover_restaurant.jpg";
import qrWhatsapp from "./assets/images/whatsapp-qr-code.png";

import audioBrocante from "./assets/audios/pitch_brocante.m4a";
import audioYesin from "./assets/audios/pitch_yesin.m4a";

/** Toggle clair/sombre (persistance localStorage) */
function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    localStorage.setItem("theme", mode);
  }, [mode]);

  return (
    <button
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
      aria-label="Basculer le thème"
      title="Basculer le thème"
    >
      {mode === "dark" ? "☀️ Clair" : "🌙 Sombre"}
    </button>
  );
}

/** Petite puce décorative */
function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-primary" />;
}

/** Carte lecteur audio (utilise les imports) */
function AudioCard({
  title,
  subtitle,
  src,
  cover,
}: {
  title: string;
  subtitle: string;
  src: string;
  cover: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="flex items-center gap-4">
        <img
          src={cover}
          alt={title}
          className="h-16 w-16 rounded-xl object-cover"
        />
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-xs opacity-70">{subtitle}</div>
          <audio controls src={src} className="mt-3 w-full accent-primary">
            Votre navigateur ne supporte pas l’audio.
          </audio>
        </div>
      </div>
    </div>
  );
}

/** Carte “lecteur” décorative statique pour la maquette */
function PlayerCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="flex items-center gap-4">
        <img
          src={coverRestaurant}
          alt="Le Volcano Burger"
          className="h-16 w-16 rounded-xl object-cover"
        />
        <div className="flex-1">
          <div className="font-semibold">Le Volcano Burger</div>
          <div className="text-xs opacity-70">Restaurant indépendant</div>
          <div className="mt-3 h-2 rounded bg-white/10">
            <div className="h-2 w-1/3 rounded bg-primary" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] opacity-70">
            <span>0:12</span>
            <span>1:30</span>
          </div>
        </div>
        <button className="h-10 w-10 rounded-full bg-primary text-white">
          ⏯
        </button>
      </div>
    </div>
  );
}

function TextLogo() {
  return (
    <span className="inline-flex items-baseline gap-1 font-extrabold tracking-tight">
      <span className="text-primary">YesIn</span>
      <span className="text-fg/70">.media</span>
    </span>
  );
}

/** Bouton discret Play/Pause pour le message du créateur */
function CreatorMessageButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  // Crée l'élément audio une seule fois
  useEffect(() => {
    const audio = new Audio(audioYesin);
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onTime = () => {
      if (!audio.duration || isNaN(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        /* ignore */
      });
    } else {
      audio.pause();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
      aria-pressed={playing}
      aria-label="La radio, en vrai"
      title="La radio, en vrai"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[11px]">
        {playing ? "⏸" : "▶"}
      </span>
      <span>La radio, en vrai</span>

      {/* mini barre de progression discrète */}
      <span
        aria-hidden="true"
        className="ml-2 block h-1 w-14 overflow-hidden rounded bg-white/10"
      >
        <span
          className="block h-full bg-primary transition-[width]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
    </button>
  );
}

function HeroCreatorMessage() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2">
      {/* Colonne gauche : promesse + CTA + bouton créateur discret */}
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          Votre voix est{" "}
          <span className="text-primary">votre meilleure publicité.</span>
        </h1>

        <p className="mt-4 max-w-xl text-lg opacity-80">
          Faites découvrir l’histoire et les valeurs de votre projet à la
          communauté qui vous entoure. 100% gratuit pour un web plus humain.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="#cta"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-white font-semibold shadow-lg hover:opacity-90"
          >
            🎙️ Enregistrer mon pitch (59s)
          </a>

          {/* Bouton discret Play/Pause du message du créateur */}
          <CreatorMessageButton />
        </div>

        {/* Badges rapides */}
        <ul className="mt-6 flex flex-wrap gap-2 text-xs opacity-80">
          <li className="rounded-full border border-white/15 px-3 py-1">
            Gratuit
          </li>
          <li className="rounded-full border border-white/15 px-3 py-1">
            59s chrono
          </li>
          <li className="rounded-full border border-white/15 px-3 py-1">
            Local & authentique
          </li>
        </ul>
      </div>

      {/* Colonne droite : uniquement l'image (mockup) */}
      <div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 blur-2xl" />
          <img
            src={mockupImg}
            alt="Aperçu de l'application YesIn"
            className="w-full rounded-3xl border border-white/10 shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

type Track = {
  title: string;
  subtitle: string;
  src: string;
  cover: string;
};

function RadioPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  // Crée une balise audio contrôlée par le composant
  useEffect(() => {
    const audio = new Audio(tracks[index].src);
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => next();
    const onTime = () => setTime(audio.currentTime);
    const onLoaded = () => setDur(audio.duration || 0);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);

    // Autoplay quand on change de piste si on était en lecture
    const shouldAutoplay = playing;
    if (shouldAutoplay) audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]); // on recrée l’audio quand l’index change

  const playPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const prev = () => {
    setTime(0);
    setIndex((i) => (i - 1 + tracks.length) % tracks.length);
  };

  const next = () => {
    setTime(0);
    setIndex((i) => (i + 1) % tracks.length);
  };

  const seek = (ratio: number) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = Math.max(0, Math.min(ratio * a.duration, a.duration));
  };

  const current = tracks[index];
  const progress = dur ? Math.min(1, Math.max(0, time / dur)) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      {/* Ligne principale : cover + infos + commandes */}
      <div className="flex items-center gap-4">
        <img
          src={current.cover}
          alt={current.title}
          className="h-20 w-20 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{current.title}</div>
          <div className="truncate text-xs opacity-70">{current.subtitle}</div>

          {/* Barre de progression cliquable */}
          <div
            className="mt-3 h-2 w-full cursor-pointer rounded bg-white/10"
            onClick={(e) => {
              const rect = (e.target as HTMLDivElement).getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seek(ratio);
            }}
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-2 rounded bg-primary transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="mt-1 flex justify-between text-[10px] opacity-70">
            <span>{formatTime(time)}</span>
            <span>{formatTime(dur || 0)}</span>
          </div>
        </div>

        {/* Commandes */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/10"
            aria-label="Piste précédente"
            title="Piste précédente"
          >
            ⏮
          </button>
          <button
            onClick={playPause}
            className="h-10 w-10 rounded-full bg-primary text-white"
            aria-pressed={playing}
            aria-label={playing ? "Pause" : "Lecture"}
            title={playing ? "Pause" : "Lecture"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            onClick={next}
            className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/10"
            aria-label="Piste suivante"
            title="Piste suivante"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Playlist */}
      <div className="mt-5 rounded-xl bg-white/3 p-2">
        <ul className="space-y-1 text-sm">
          {tracks.map((t, i) => {
            const active = i === index;
            return (
              <li key={t.title}>
                <button
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/5 ${
                    active ? "bg-primary/10 ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => setIndex(i)}
                  aria-current={active ? "true" : "false"}
                >
                  <img
                    src={t.cover}
                    alt=""
                    className="h-8 w-8 flex-none rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="truncate text-xs opacity-70">
                      {t.subtitle}
                    </div>
                  </div>
                  {active && (
                    <span className="text-xs text-primary">• En cours</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      {/* Header simple */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <TextLogo />

          {/* BOUTON ENREGISTRER CENTRÉ */}
          <a
            href="#cta"
            className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center rounded-2xl bg-[#7266EE] px-5 py-2.5 text-white font-semibold shadow-lg hover:opacity-90"
          >
            🎙️ Enregistrer ma publicité
            <span className="sr-only">ouvrir la section d’enregistrement</span>
          </a>

          {/* Toggle thème à droite */}
          <ThemeToggle />
        </div>
      </header>
      <HeroCreatorMessage />
      {/* Alternance image/texte — LA SOLUTION */}
      <section
        id="solution"
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2"
      >
        <div className="md:pr-8">
          <h3 className="text-3xl font-bold">
            La Solution : <span className="text-primary">yesin.media</span>
          </h3>
          <p className="mt-4 opacity-85">
            Nous redonnons le pouvoir à votre voix. yesin.media connecte acteurs
            locaux et habitants curieux. Un passant se promène dans votre
            quartier, ouvre notre radio et entend
            <span className="font-semibold"> votre voix</span> raconter votre
            histoire.
          </p>
          <p className="mt-3 opacity-85">
            Ce n’est pas une publicité : c’est une conversation. Nous
            transformons votre histoire en vitrine locale, authentique et
            engageante.
          </p>
          <div className="mt-6">
            <a
              href="#cta"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-white font-semibold hover:opacity-90"
            >
              Démarrer gratuitement
            </a>
          </div>
        </div>

        <div className="md:pl-8">
          <RadioPlayer
            tracks={[
              {
                title: "Le Volcano Burger",
                subtitle: "Restaurant indépendant",
                src: audioYesin,
                cover: coverRestaurant,
              },
              {
                title: "La Grande Brocante",
                subtitle: "Quartier Saint-Pierre",
                src: audioBrocante,
                cover: coverBrocante,
              },
              {
                title: "L'Atelier du Coiffeur",
                subtitle: "Une coupe qui vous ressemble",
                src: audioYesin,
                cover: coverCoiffeur,
              },
            ]}
          />
        </div>
      </section>
      {/* Étapes en bande contrastée */}
      <section id="etapes" className="bg-primary/10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h3 className="text-center text-2xl md:text-3xl font-bold">
            Simple comme 1, 2, 3.
          </h3>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "👤",
                title: "Créez votre profil",
                desc: "Renseignez les infos clés en moins de 2 minutes pour que les auditeurs puissent vous retrouver.",
              },
              {
                icon: "🎙️",
                title: "Enregistrez votre pitch",
                desc: "Depuis votre téléphone, présentez votre projet en 90 secondes. L'authenticité prime.",
              },
              {
                icon: "📡",
                title: "Devenez audible localement",
                desc: "Votre pitch est disponible instantanément pour des milliers d’habitants autour de vous.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-3 text-2xl">{s.icon}</div>
                <h4 className="font-semibold">{s.title}</h4>
                <p className="mt-2 text-sm opacity-80">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Exemples (carte centrale) */}
      <section
        id="exemples"
        className="mx-auto max-w-7xl px-6 py-16 text-center"
      >
        <h3 className="text-2xl md:text-3xl font-bold">
          La radio locale, ça sonne comme ça.
        </h3>
        <p className="mx-auto mt-3 max-w-2xl opacity-80">
          Plongez dans l’ambiance et écoutez les histoires qui font vivre votre
          quartier.
        </p>
        <div className="mx-auto mt-10 grid gap-6 md:grid-cols-2 max-w-3xl text-left">
          <AudioCard
            title="La Grande Brocante"
            subtitle="Quartier Saint-Pierre"
            src={audioBrocante}
            cover={coverBrocante}
          />
          <AudioCard
            title="L'Atelier du Coiffeur"
            subtitle="Une coupe qui vous ressemble"
            src={audioYesin}
            cover={coverCoiffeur}
          />
        </div>
      </section>
      <section
        id="inscription"
        className="relative overflow-hidden bg-primary/10"
      >
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h3 className="text-3xl md:text-4xl font-extrabold">
            Votre publicité audio{" "}
            <span class="underline">vraiment gratuite</span> vous attend.
          </h3>
          <p className="mt-2 opacity-85">
            Renseignez votre contact et touchez des milliers de clients dans
            votre quartier, simplement avec votre voix.
          </p>

          {/* === FORMULAIRE D'INSCRIPTION === */}
          <form className="mt-8 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Votre email ou téléphone"
              className="rounded-lg border-white/20 bg-white/5 p-3 text-center"
              // L'attribut "inputMode" aide les mobiles à afficher le bon clavier
              // "text" est un choix neutre et sûr.
              inputMode="text"
              required
            />
            {/* Vous pouvez aussi demander le téléphone via un champ type="tel" 
        ou utiliser le Social Login de Supabase (Google, etc.) pour simplifier.
      */}
            <button
              type="submit"
              className="rounded-2xl bg-primary px-7 py-3 text-white font-semibold shadow-lg hover:opacity-90"
            >
              📢 Créer mon profil
            </button>
          </form>
          {/* ============================== */}
        </div>
      </section>
      {/* Gros CTA final */}
      <section id="cta" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h3 className="text-3xl md:text-4xl font-extrabold">
            Prêt à faire entendre votre histoire à Lille ?
          </h3>
          <p className="mt-2 opacity-85">
            Votre voix a de la valeur. Il est temps de la faire entendre.
          </p>
          <a
            href="#"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-7 py-3 text-white font-semibold shadow-lg hover:opacity-90"
          >
            🚀 Je partage mon histoire en 90s
          </a>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm opacity-80 md:flex-row">
          <div className="flex items-center gap-2">
            <TextLogo />
            <span>
              — © {new Date().getFullYear()} • Pour un web plus humain. Fait à
              Lille. 🌱
            </span>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={qrWhatsapp}
              alt="QR WhatsApp"
              className="h-10 w-10 rounded bg-white p-1"
            />
            <a href="#" className="hover:opacity-100 opacity-80">
              Mentions
            </a>
            <a href="#" className="hover:opacity-100 opacity-80">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
