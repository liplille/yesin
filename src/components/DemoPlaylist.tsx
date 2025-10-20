// src/components/DemoPlaylist.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/solid";

interface DemoFile {
  id: string;
  name: string;
  created_at: string;
  publicURL: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `à l'instant`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export default function DemoPodcastPlayer() {
  const [demos, setDemos] = useState<DemoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(currentIndex);
  const demosLengthRef = useRef(demos.length);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    demosLengthRef.current = demos.length;
  }, [demos.length]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ➡️ Factorise la logique dans un callback réutilisable
  const fetchDemos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("demopitches")
      .list("", {
        limit: 5,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error || !data) {
      console.error("Erreur fetch demos:", error);
      setLoading(false);
      return;
    }

    const filesWithUrls: DemoFile[] = data
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map((file) => ({
        ...(file as any),
        publicURL: supabase.storage.from("demopitches").getPublicUrl(file.name)
          .data.publicUrl,
      })) as DemoFile[];

    setDemos(filesWithUrls);
    setLoading(false);
  }, []);

  // Chargement initial
  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]); // identique au comportement d’origine, mais réutilisable

  // ➕ NOUVEAU : écoute l’événement "demo:uploaded" pour recharger la liste
  useEffect(() => {
    const onUploaded = (e: Event) => {
      // Optionnel : filtrer par bucket si besoin
      const ce = e as CustomEvent<{ bucket?: string }>;
      if (!ce.detail || ce.detail.bucket === "demopitches") {
        fetchDemos();
      }
    };
    window.addEventListener("demo:uploaded", onUploaded as EventListener);
    return () =>
      window.removeEventListener("demo:uploaded", onUploaded as EventListener);
  }, [fetchDemos]);

  // Setup et listeners audio (identique à la version précédente)
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const updateProgress = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      const currentIdx = currentIndexRef.current;
      const totalDemos = demosLengthRef.current;
      if (currentIdx === totalDemos - 1) {
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setIsPlaying(true); // 🔒 reste en lecture quand on avance
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audioRef.current = null;
    };
  }, []);

  // Charger/Jouer la piste courante (conserve la logique existante)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || demos.length === 0 || currentIndex >= demos.length) {
      if (audio && !audio.paused) {
        audio.pause();
      }
      if (demos.length === 0) {
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
      }
      return;
    }

    const currentTrackUrl = demos[currentIndex].publicURL;
    if (audio.src !== currentTrackUrl) {
      audio.pause();
      audio.src = currentTrackUrl;
      setCurrentTime(0);
      setDuration(0);
    }

    setTimeout(() => {
      if (isPlayingRef.current) {
        audio.play().catch((e) => {
          console.error("Erreur de lecture auto:", e);
          setIsPlaying(false);
        });
      } else {
        if (!audio.paused) audio.pause();
      }
    }, 0);
  }, [currentIndex, demos, isPlaying]);

  const handleNext = useCallback(() => {
    if (demos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % demos.length);
  }, [demos.length]);

  const handlePrev = useCallback(() => {
    if (demos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + demos.length) % demos.length);
  }, [demos.length]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const newState = !isPlaying;
    setIsPlaying(newState);
    if (newState) {
      audio.play().catch((e) => {
        console.error("Erreur play direct:", e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  };

  const handleSelectTrack = (index: number) => {
    if (index === currentIndex) {
      handlePlayPause();
    } else {
      setCurrentIndex(index);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (loading)
    return <div className="p-4 text-center opacity-70">Chargement...</div>;
  if (demos.length === 0)
    return (
      <div className="p-4 text-center opacity-70">Aucun essai à écouter.</div>
    );

  const currentTrack = demos[currentIndex];
  const progressPercent =
    duration > 0 && currentTime <= duration
      ? (currentTime / duration) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-black/10 bg-white/5 p-5 shadow-lg dark:border-white/10 flex flex-col gap-4">
      {/* --- Section Lecteur --- */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
          <MicrophoneIcon className="h-10 w-10 text-primary/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">Pitch de la communauté</p>
          <p className="text-xs opacity-70">
            {currentTrack ? formatRelativeTime(currentTrack.created_at) : "--"}
          </p>

          {/* Barre de progression */}
          <div className="mt-2 space-y-1">
            <div
              className="h-2 w-full bg-black/10 dark:bg-white/10 rounded cursor-pointer group relative"
              onClick={handleSeek}
              role="slider"
              aria-label="Progression de la lecture"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              aria-valuetext={`Temps écoulé ${formatTime(
                currentTime
              )}, Durée totale ${formatTime(duration)}`}
              tabIndex={0}
            >
              <div
                className="h-2 bg-primary rounded absolute top-0 left-0 transition-width duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] opacity-70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section Contrôles --- */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="control-btn"
          aria-label="Piste précédente"
          title="Piste précédente"
          disabled={demos.length <= 1}
        >
          <BackwardIcon className="h-5 w-5" />
        </button>
        <button
          onClick={handlePlayPause}
          className="control-btn play-btn"
          aria-label={isPlaying ? "Mettre en pause" : "Lire"}
          title={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <PauseIcon className="h-8 w-8" />
          ) : (
            <PlayIcon className="h-8 w-8" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="control-btn"
          aria-label="Piste suivante"
          title="Piste suivante"
          disabled={demos.length <= 1}
        >
          <ForwardIcon className="h-5 w-5" />
        </button>
      </div>

      {/* --- Section Playlist --- */}
      <div className="mt-2 border-t border-black/10 dark:border-white/10 pt-4">
        <h5 className="text-sm font-bold mb-2 px-2">À écouter</h5>
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {demos.map((demo, index) => (
            <li key={demo.id}>
              <button
                onClick={() => handleSelectTrack(index)}
                className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${
                  currentIndex === index
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                aria-current={currentIndex === index ? "true" : "false"}
              >
                {currentIndex === index && isPlaying ? (
                  <PauseIcon
                    className="h-5 w-5 text-primary flex-shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <PlayIcon
                    className={`h-5 w-5 flex-shrink-0 ${
                      currentIndex === index ? "text-primary" : "text-fg/50"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span className="flex-1 truncate text-sm">
                  Essai #{demos.length - index}
                </span>
                <span className="text-xs opacity-60 flex-shrink-0">
                  {formatRelativeTime(demo.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Styles locaux pour les boutons */}
      <style>{`
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          transition: background-color 0.2s, opacity 0.2s;
          color: var(--color-fg);
          background-color: transparent;
        }
        .control-btn:hover:not(:disabled) { background-color: oklch(from var(--color-fg) l c h / 0.1); }
        .control-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .control-btn:not(.play-btn) { width: 2.5rem; height: 2.5rem; }
        .play-btn {
            width: 4rem; height: 4rem;
            background-color: var(--color-primary);
            color: white;
        }
        .play-btn:hover:not(:disabled) { background-color: oklch(from var(--color-primary) l c h / 0.9); }

        div[role="slider"]:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        div[role="slider"] {
            outline: none;
        }
      `}</style>
    </div>
  );
}
