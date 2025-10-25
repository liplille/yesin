// src/pages/GetStartedPage.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
} from "@heroicons/react/24/solid";
import "../index.css"; // Assurez-vous que ce chemin est correct
import AuthForm from "../components/AuthForm"; // Utilisé pour la section inscription en bas
import TextLogo from "../components/TextLogo";
import type { RootOutletContext } from "../layout/RootLayout"; // Type pour le contexte du Layout
import { DemoRecorder } from "../components/DemoRecorder"; // Composant démo enregistreur
import DemoPlaylist from "../components/DemoPlaylist"; // Composant démo playlist
import { requestAudioFocus, onAudioFocus } from "../utils/audioFocus"; // Utilitaires pour gérer le focus audio
import ExitIntentModal from "../components/ExitIntentModal"; // La modale d'intention de sortie
import { useExitIntent } from "../hooks/useExitIntent"; // Le hook pour la modale

/* === ASSETS === */
// Images
import mockupImg from "../assets/images/yesin-app-mockup.png";
import coverBrocante from "../assets/images/cover_brocante.png";
import coverImmobilier from "../assets/images/cover_immobilier.png";
import coverRestaurant from "../assets/images/cover_restaurant.jpg";
// Audios
import audioRestaurant from "../assets/audios/pitch_restaurant.m4a";
import audioBrocante from "../assets/audios/pitch_brocante.m4a";
import audioImmobilier from "../assets/audios/pitch_immobilier.m4a";
import audioYesin from "../assets/audios/pitch_yesin.m4a"; // Audio du créateur

/** -------- Helpers -------- */
// Met en majuscule uniquement la première lettre d'une chaîne
function capitalizeFirstOnly(s: string): string {
  const t = s.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/** Composant : Bouton Play/Pause discret pour le message audio du créateur */
function CreatorMessageButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // Progression (0 à 1)

  useEffect(() => {
    // Crée l'élément audio et le stocke dans la ref
    const audio = new Audio(audioYesin);
    audioRef.current = audio;

    // S'abonne au focus audio : met en pause si un autre lecteur démarre
    const cleanupFocus = onAudioFocus("creator", () => {
      audio.pause();
    });

    // Handlers pour les événements audio
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      // Réinitialise à la fin
      setPlaying(false);
      setProgress(0);
    };
    const onTime = () => {
      // Met à jour la progression
      if (!audio.duration || isNaN(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };

    // Attache les listeners
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);

    // Fonction de nettoyage au démontage
    return () => {
      audio.pause(); // Arrête la lecture
      // Détache les listeners
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audioRef.current = null; // Nettoie la ref
      cleanupFocus(); // Détache le listener de focus
    };
  }, []); // Exécuté une seule fois au montage

  // Fonction pour basculer Play/Pause
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      requestAudioFocus("creator"); // Demande le focus avant de jouer
      audio.play().catch((e) => console.error("Erreur de lecture audio:", e));
    } else {
      audio.pause();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 dark:border-white/10 overflow-hidden" // overflow-hidden pour la barre
      aria-pressed={playing}
      aria-label="Écouter le message du créateur : La radio, en vrai"
      title="La radio, en vrai"
    >
      {/* Icone Play/Pause */}
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white flex-shrink-0">
        {playing ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayIcon className="h-3 w-3" />
        )}
      </span>
      {/* Texte */}
      <span className="flex-shrink-0 whitespace-nowrap">La radio, en vrai</span>
      {/* Barre de progression */}
      <span
        aria-hidden="true"
        className="flex-1 block h-1 overflow-hidden rounded bg-black/10 dark:bg-white/10 min-w-[30px]" // Ajout min-w
      >
        <span
          className="block h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
    </button>
  );
}

/** Composant : Section Hero (Titre principal, description, boutons) */
function HeroCreatorMessage({ geoCity }: { geoCity: string | null }) {
  // Met en forme le nom de la ville (Majuscule initiale)
  const cityDisplay = useMemo(
    () => (geoCity ? capitalizeFirstOnly(geoCity) : null),
    [geoCity]
  );

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 py-12 lg:grid-cols-2">
      {/* Colonne Gauche: Texte */}
      <div>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Votre voix est{" "}
          <span className="text-primary">votre meilleure publicité.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg opacity-80">
          Faites découvrir l’histoire et les valeurs de votre projet à la
          communauté qui vous entoure. 100% gratuit pour un web plus humain.
        </p>
        {/* Boutons d'action */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row flex-wrap items-center">
          <Link
            to="/welcome" // Lien vers la page d'inscription/connexion
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90 text-center"
          >
            {cityDisplay
              ? `🎙️ Faites-vous entendre à ${cityDisplay}`
              : "🎙️ Faites-vous entendre"}
          </Link>
          <CreatorMessageButton /> {/* Bouton Play/Pause du message créateur */}
        </div>
        {/* Tags */}
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
      {/* Colonne Droite: Image Mockup */}
      <div>
        <div className="relative">
          {/* Effet de flou en arrière-plan */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 blur-2xl opacity-70 dark:opacity-50" />
          <img
            src={mockupImg}
            alt="Aperçu de l'application YesIn sur un téléphone"
            className="w-full rounded-3xl border border-black/10 shadow-2xl dark:border-white/10"
          />
        </div>
      </div>
    </section>
  );
}

// Helper pour formater le temps en minutes:secondes
function formatTime(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// Type pour les pistes audio du lecteur radio
type Track = {
  title: string;
  subtitle: string;
  src: string;
  cover: string;
};

/** Composant : Lecteur audio type radio avec playlist */
function RadioPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0); // Index de la piste actuelle
  const [playing, setPlaying] = useState(false); // État Play/Pause
  const [time, setTime] = useState(0); // Temps courant de lecture
  const [dur, setDur] = useState(0); // Durée totale de la piste

  // Effet pour charger et gérer l'audio quand l'index change
  useEffect(() => {
    // Crée un nouvel élément Audio avec la source de la piste actuelle
    const audio = new Audio(tracks[index].src);
    audioRef.current = audio;

    // Met en pause si un autre lecteur prend le focus
    const cleanupFocus = onAudioFocus("radio", () => audio.pause());

    // Handlers pour les événements audio
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => next(); // Passe à la suivante à la fin
    const onTime = () => setTime(audio.currentTime); // Met à jour le temps courant
    const onLoaded = () => setDur(audio.duration || 0); // Met à jour la durée

    // Attache les listeners
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);

    // Si l'état global était 'playing', tente de démarrer la lecture
    if (playing)
      audio.play().catch(() => {
        /* Ignore autoplay error */
      });

    // Fonction de nettoyage
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audioRef.current = null;
      cleanupFocus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]); // Se redéclenche si l'index change

  // Basculer Play/Pause
  const playPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      requestAudioFocus("radio"); // Demande le focus
      a.play().catch(() => {}); // Gère l'erreur potentielle
    } else {
      a.pause();
    }
  };

  // Passer à la piste précédente
  const prev = () => {
    setTime(0); // Réinitialise le temps
    setIndex((i) => (i - 1 + tracks.length) % tracks.length); // Boucle dans la liste
  };

  // Passer à la piste suivante
  const next = () => {
    setTime(0);
    setIndex((i) => (i + 1) % tracks.length);
  };

  // Aller à un point précis de la piste (clic sur la barre de progression)
  const seek = (ratio: number) => {
    const a = audioRef.current;
    if (!a || !a.duration || isNaN(a.duration)) return;
    // Calcule le nouveau temps et s'assure qu'il est dans les limites
    a.currentTime = Math.max(0, Math.min(ratio * a.duration, a.duration));
  };

  const current = tracks[index]; // Piste actuelle
  // Calcule la progression (0 à 1), gère le cas où la durée n'est pas encore connue
  const progress = dur ? Math.min(1, Math.max(0, time / dur)) : 0;

  return (
    <div className="rounded-2xl border border-black/10 bg-white/5 p-5 shadow-lg dark:border-white/10">
      {/* Section supérieure: Cover, Titre, Barre de progression, Temps */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:flex-nowrap sm:justify-between">
        <div className="flex min-w-[200px] flex-1 items-center gap-4">
          {/* Cover */}
          <img
            src={current.cover}
            alt={`Pochette pour ${current.title}`}
            className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
          />
          {/* Infos piste + Progression */}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{current.title}</div>
            <div className="truncate text-xs opacity-70">
              {current.subtitle}
            </div>
            {/* Barre de progression cliquable */}
            <div
              className="mt-3 h-2 w-full cursor-pointer rounded bg-black/10 dark:bg-white/10 relative group" // Ajout relative group
              onClick={(e) => {
                const rect = (
                  e.target as HTMLDivElement
                ).getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                seek(ratio);
              }}
              role="progressbar" // Sémantique pour accessibilité
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression de la lecture"
            >
              {/* Partie remplie de la barre */}
              <div
                className="h-2 rounded bg-primary absolute top-0 left-0 transition-[width]" // Position absolue
                style={{ width: `${progress * 100}%` }}
              />
              {/* Indicateur visuel au survol/focus */}
              <div
                className="absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${progress * 100}%` }}
                aria-hidden="true"
              ></div>
            </div>
            {/* Affichage temps courant / durée totale */}
            <div className="mt-1 flex justify-between text-[10px] opacity-70">
              <span>{formatTime(time)}</span>
              <span>{formatTime(dur || 0)}</span>
            </div>
          </div>
        </div>

        {/* Boutons de contrôle */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={prev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 hover:bg-white/10 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Piste précédente"
            title="Piste précédente"
            disabled={tracks.length <= 1} // Désactivé si une seule piste
          >
            <BackwardIcon className="h-5 w-5" />
          </button>
          <button
            onClick={playPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
            aria-pressed={playing} // État pour accessibilité
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 hover:bg-white/10 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Piste suivante"
            title="Piste suivante"
            disabled={tracks.length <= 1}
          >
            <ForwardIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Section Playlist */}
      <div className="mt-5 rounded-xl bg-bg/30 dark:bg-black/20 p-2">
        {" "}
        {/* Fond légèrement différent */}
        <h4 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider opacity-70">
          Playlist locale
        </h4>
        <ul className="space-y-1 text-sm max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {" "}
          {/* Scrollable */}
          {tracks.map((t, i) => {
            const active = i === index;
            return (
              <li key={t.src}>
                {" "}
                {/* Utiliser src comme clé unique */}
                <button
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 ${
                    active
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  onClick={() => setIndex(i)} // Sélectionne la piste au clic
                  aria-current={active ? "page" : undefined} // Sémantique pour piste active
                >
                  <img
                    src={t.cover}
                    alt="" // Image décorative
                    className="h-8 w-8 flex-none rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-medium ${
                        active ? "text-primary" : ""
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="truncate text-xs opacity-70">
                      {t.subtitle}
                    </div>
                  </div>
                  {/* Indicateur visuel "En cours" */}
                  {active &&
                    playing && ( // Affiché seulement si active ET en lecture
                      <span className="text-xs text-primary flex-shrink-0">
                        • En cours
                      </span>
                    )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Styles pour la scrollbar custom */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: oklch(from var(--color-fg) l c h / 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin-block: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: oklch(from var(--color-fg) l c h / 0.2);
          border-radius: 3px; border: 1px solid transparent; background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: oklch(from var(--color-fg) l c h / 0.4); }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: oklch(from var(--color-fg) l c h / 0.3); }
      `}</style>
    </div>
  );
}

/** Composant principal de la page GetStarted */
// ✅ CORRECTION APPLIQUÉE ICI : Renommage de la fonction
export default function GetStartedPage() {
  const { session, geoCity } = useOutletContext<RootOutletContext>();
  const cityDisplay = useMemo(
    () => (geoCity ? capitalizeFirstOnly(geoCity) : null),
    [geoCity]
  );
  const isLoggedIn = !!session;

  const { open, dismiss, closeWithoutEvent } = useExitIntent({
    sessionKey: "exit-intent:getstarted:dismissed",
    topBoundary: 8,
    delay: 80,
    mobileVisibility: true,
    enabled: !isLoggedIn,
  });

  return (
    <div className="bg-bg text-fg">
      <HeroCreatorMessage geoCity={geoCity} />

      <section
        id="solution"
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2"
      >
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
            quartier, ouvre notre radio et entend{" "}
            <span className="font-semibold">votre voix</span> raconter votre
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
        <div className="lg:pl-8">
          <RadioPlayer
            tracks={[
              {
                title: "Le Lil'Restô",
                subtitle: "Restaurant indépendant",
                src: audioRestaurant,
                cover: coverRestaurant,
              },
              {
                title: "La Grande Brocante",
                subtitle: "Quartier Saint-Pierre",
                src: audioBrocante,
                cover: coverBrocante,
              },
              {
                title: "Le phare immobilier",
                subtitle: "L'agence proche de la mer",
                src: audioImmobilier,
                cover: coverImmobilier,
              },
            ]}
          />
        </div>
      </section>

      <section id="etapes" className="bg-primary/10 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h3 className="text-center text-2xl font-bold md:text-3xl">
            Simple comme 1, 2, 3.
          </h3>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
                className="rounded-2xl border border-black/10 bg-bg p-6 shadow-sm dark:border-white/10 dark:bg-bg/50"
              >
                <div className="mb-3 text-2xl">{s.icon}</div>
                <h4 className="font-semibold">{s.title}</h4>
                <p className="mt-2 text-sm opacity-80">{s.desc}</p>
                {s.title === "Créez votre profil" && (
                  <Link
                    to="/welcome"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline decoration-primary/60 underline-offset-4 hover:decoration-primary/80"
                    aria-label="Créer mon profil maintenant (ouvrir l'inscription)"
                  >
                    Créer mon profil maintenant <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="demo-enregistreur"
        className="mx-auto max-w-7xl py-16 px-4 sm:px-6"
      >
        <div className="text-center">
          <h3 className="text-2xl font-bold md:text-3xl">
            La radio locale, ça sonne comme ça.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl opacity-80">
            Découvrez des exemples de pitchs audio créés par des acteurs locaux
            comme vous, et testez notre enregistreur en direct.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 items-stretch gap-10 lg:grid-cols-2">
          <DemoRecorder />
          <DemoPlaylist />
        </div>
      </section>

      {!session && (
        <section
          id="inscription"
          className="relative overflow-hidden bg-primary/10 py-20"
        >
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h3 className="text-3xl font-extrabold md:text-4xl">
              Votre publicité audio{" "}
              <span className="underline decoration-wavy decoration-primary/50">
                vraiment gratuite
              </span>{" "}
              vous attend.
            </h3>
            <p className="mt-2 opacity-85">
              Renseignez votre contact et touchez des milliers de clients dans
              votre quartier.
            </p>
            <div className="mt-8 flex justify-center">
              <AuthForm buttonLabel="📢 Créer mon profil & Enregistrer" />
            </div>
          </div>
        </section>
      )}

      <section id="cta" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent opacity-70 dark:opacity-40" />
        <div className="mx-auto max-w-5xl py-20 text-center px-4 sm:px-6">
          <h3 className="text-3xl font-extrabold md:text-4xl">
            Prêt à faire entendre votre histoire
            {cityDisplay ? ` à ${cityDisplay}` : ""} ?
          </h3>
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

      <ExitIntentModal
        open={!isLoggedIn && open}
        onClose={dismiss}
        onCloseWithoutEvent={closeWithoutEvent}
      />
    </div>
  );
}
