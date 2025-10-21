// src/pages/GetStartedPage.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
} from "@heroicons/react/24/solid";
import "../index.css";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../auth/AuthProvider";
import TextLogo from "../components/TextLogo";
import type { RootOutletContext } from "../layout/RootLayout";
import { DemoRecorder } from "../components/DemoRecorder"; // Nouvel import
import DemoPlaylist from "../components/DemoPlaylist"; // <-- IMPORTER LE NOUVEAU COMPOSANT

/* === ASSETS === */
import mockupImg from "../assets/images/yesin-app-mockup.png";
import coverBrocante from "../assets/images/cover_brocante.png";
import coverCoiffeur from "../assets/images/cover_coiffeur.png";
import coverRestaurant from "../assets/images/cover_restaurant.jpg";

import audioBrocante from "../assets/audios/pitch_brocante.m4a";
import audioYesin from "../assets/audios/pitch_yesin.m4a";

/** -------- Helpers -------- */
function capitalizeFirstOnly(s: string): string {
  const t = s.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/** Bouton discret Play/Pause pour le message du créateur */
function CreatorMessageButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

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
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 dark:border-white/10"
      aria-pressed={playing}
      aria-label="La radio, en vrai"
      title="La radio, en vrai"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
        {playing ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayIcon className="h-3 w-3" />
        )}
      </span>
      <span>La radio, en vrai</span>
      <span
        aria-hidden="true"
        className="ml-2 block h-1 w-14 overflow-hidden rounded bg-black/10 dark:bg-white/10"
      >
        <span
          className="block h-full bg-primary transition-[width]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
    </button>
  );
}

function HeroCreatorMessage({ geoCity }: { geoCity: string | null }) {
  const cityDisplay = useMemo(
    () => (geoCity ? capitalizeFirstOnly(geoCity) : null),
    [geoCity]
  );

  return (
    // Utilise lg: pour passer en 2 colonnes à 1024px
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 py-12 lg:grid-cols-2">
      {/* Retiré px-6 ici, géré par RootLayout */}
      <div>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Votre voix est{" "}
          <span className="text-primary">votre meilleure publicité.</span>
        </h1>

        <p className="mt-4 max-w-xl text-lg opacity-80">
          Faites découvrir l’histoire et les valeurs de votre projet à la
          communauté qui vous entoure. 100% gratuit pour un web plus humain.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/welcome"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90"
          >
            {cityDisplay
              ? `🎙️ Faites-vous entendre à ${cityDisplay}`
              : "🎙️ Faites-vous entendre"}
          </Link>
          <CreatorMessageButton />
        </div>

        <ul className="mt-6 flex flex-wrap gap-2 text-xs opacity-80">
          <li className="rounded-full border border-black/10 px-3 py-1 dark:border-white/15">
            Gratuit
          </li>
          <li className="rounded-full border border-black/10 px-3 py-1 dark:border-white/15">
            59s chrono
          </li>
          <li className="rounded-full border border-black/10 px-3 py-1 dark:border-white/15">
            Local & authentique
          </li>
        </ul>
      </div>

      <div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 blur-2xl" />
          <img
            src={mockupImg}
            alt="Aperçu de l'application YesIn"
            className="w-full rounded-3xl border border-black/10 shadow-2xl dark:border-white/10"
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
  }, [index]);

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
    <div className="rounded-2xl border border-black/10 bg-white/5 p-5 shadow-lg dark:border-white/10">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:flex-nowrap sm:justify-between">
        <div className="flex min-w-[200px] flex-1 items-center gap-4">
          <img
            src={current.cover}
            alt={current.title}
            className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{current.title}</div>
            <div className="truncate text-xs opacity-70">
              {current.subtitle}
            </div>
            <div
              className="mt-3 h-2 w-full cursor-pointer rounded bg-black/10 dark:bg-white/10"
              onClick={(e) => {
                const rect = (
                  e.target as HTMLDivElement
                ).getBoundingClientRect();
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
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={prev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 hover:bg-white/10 dark:border-white/10"
            aria-label="Piste précédente"
            title="Piste précédente"
          >
            <BackwardIcon className="h-5 w-5" />
          </button>
          <button
            onClick={playPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
            aria-pressed={playing}
            aria-label={
              playing
                ? `Mettre en pause ${current.title}`
                : `Lire ${current.title}`
            }
            title={playing ? "Pause" : "Lecture"}
          >
            {playing ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={next}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 hover:bg-white/10 dark:border-white/10"
            aria-label="Piste suivante"
            title="Piste suivante"
          >
            <ForwardIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

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
  const { geoCity } = useOutletContext<RootOutletContext>();
  const cityDisplay = useMemo(
    () => (geoCity ? capitalizeFirstOnly(geoCity) : null),
    [geoCity]
  );

  const { session } = useAuth();

  return (
    // RootLayout gère le padding principal (px-4 sm:px-6)
    <main className="min-h-screen bg-bg text-fg">
      <HeroCreatorMessage geoCity={geoCity} />

      <section
        id="solution"
        // Utilise lg: pour passer en 2 colonnes à 1024px
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2"
        // Retiré px-6
      >
        {/* Utilise lg: pour le padding interne à 1024px */}
        <div className="lg:pr-8">
          <h3 className="text-3xl font-bold">
            La Solution :{" "}
            <span className="text-primary">
              <TextLogo />
            </span>
          </h3>
          <p className="mt-4 opacity-85">
            Nous redonnons le pouvoir à votre voix. YesIn.media connecte acteurs
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
            <Link
              to="/welcome"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90"
            >
              Démarrer gratuitement
            </Link>
          </div>
        </div>

        {/* Utilise lg: pour le padding interne à 1024px */}
        <div className="lg:pl-8">
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

      <section id="etapes" className="bg-primary/10">
        {/* Retiré px-6 */}
        <div className="mx-auto max-w-7xl py-16">
          <h3 className="text-center text-2xl font-bold md:text-3xl px-4">
            {" "}
            {/* Ajout px-4 ici si besoin */}
            Simple comme 1, 2, 3.
          </h3>
          {/* Utilise lg: pour passer en 3 colonnes à 1024px */}
          {/* Ajout px-4 ici si besoin pour le conteneur grid */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3 px-4">
            {[
              {
                icon: "👤",
                title: "Créez votre profil",
                desc: "Renseignez les infos clés en moins de 2 minutes pour que les auditeurs puissent vous retrouver.",
              },
              {
                icon: "🎙️",
                title: "Enregistrez votre pitch",
                desc: "Depuis votre téléphone, présentez votre projet en 59 secondes. L'authenticité prime.",
              },
              {
                icon: "📡",
                title: "Devenez audible localement",
                desc: "Votre pitch est disponible instantanément pour des milliers d’habitants autour de vous.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-black/10 bg-white/5 p-6 dark:border-white/10"
              >
                <div className="mb-3 text-2xl">{s.icon}</div>
                <h4 className="font-semibold">{s.title}</h4>
                <p className="mt-2 text-sm opacity-80">{s.desc}</p>
                {s.title === "Créez votre profil" && (
                  <Link
                    to="/welcome"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline decoration-primary/60 underline-offset-4 hover:opacity-100"
                    aria-label="Créer mon profil maintenant (ouverture de l’onboarding)"
                  >
                    Créer mon profil maintenant
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODIFIÉ: Retiré padding horizontal de la section */}
      <section id="demo-enregistreur" className="mx-auto max-w-7xl py-16">
        {/* Ajout d'un padding pour le texte si nécessaire */}
        <div className="text-center px-4">
          <h3 className="text-2xl font-bold md:text-3xl">
            La radio locale, ça sonne comme ça.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl opacity-80">
            Découvrez des exemples de pitchs audio créés par des acteurs locaux
            comme vous, et testez notre enregistreur en direct.
          </p>
        </div>

        {/* MODIFIÉ: gap-4 lg:gap-8, retiré max-w/mx-auto pour mobile */}
        <div className="mt-10 grid gap-4 lg:gap-8 lg:grid-cols-2 lg:max-w-5xl lg:mx-auto">
          {/* Les composants internes ont déjà p-4 sm:p-5 */}
          <DemoRecorder />
          <DemoPlaylist />
        </div>
      </section>

      {!session && (
        <section
          id="inscription"
          className="relative overflow-hidden bg-primary/10"
        >
          {/* Retiré px-6 */}
          <div className="mx-auto max-w-2xl py-20 text-center px-4">
            {" "}
            {/* Ajout px-4 */}
            <h3 className="text-3xl font-extrabold md:text-4xl">
              Votre publicité audio{" "}
              <span className="underline">vraiment gratuite</span> vous attend.
            </h3>
            <p className="mt-2 opacity-85">
              Renseignez votre contact et touchez des milliers de clients dans
              votre quartier.
            </p>
            <div className="mt-8 flex justify-center">
              <AuthForm buttonLabel="📢 Créer mon profil" />
            </div>
          </div>
        </section>
      )}

      <section id="cta" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        {/* Retiré px-6 */}
        <div className="mx-auto max-w-5xl py-20 text-center px-4">
          {" "}
          {/* Ajout px-4 */}
          {cityDisplay ? (
            <h3 className="text-3xl font-extrabold md:text-4xl">
              {`Prêt à faire entendre votre histoire à ${cityDisplay} ?`}
            </h3>
          ) : (
            <div className="space-y-2">
              <h3 className="text-3xl font-extrabold md:text-4xl">
                Prêt à faire entendre votre histoire ?
              </h3>
              <p className="text-xl">🎙️ Faites-vous entendre</p>
            </div>
          )}
          <p className="mt-2 opacity-85">
            Votre voix a de la valeur. Il est temps de la faire entendre.
          </p>
          <Link
            to="/welcome"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-7 py-3 font-semibold text-white shadow-lg hover:opacity-90"
          >
            🚀 Je partage mon histoire en 59s
          </Link>
        </div>
      </section>
    </main>
  );
}
