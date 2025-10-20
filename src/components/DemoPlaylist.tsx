// src/components/DemoPodcastPlayer.tsx
import { useState, useEffect, useRef, useCallback } from "react"; // CHANGEMENT: useCallback ajouté
import { supabase } from "../lib/supabaseClient";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/solid";

// ... (Les interfaces et fonctions utilitaires formatTime, formatRelativeTime ne changent pas) ...
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

  // ... (useEffect pour fetchDemos ne change pas) ...
  useEffect(() => {
    const fetchDemos = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("demopitches")
        .list("", {
          limit: 5,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const filesWithUrls = data
        .filter((file) => file.name !== ".emptyFolderPlaceholder")
        .map((file) => ({
          ...file,
          publicURL: supabase.storage
            .from("demopitches")
            .getPublicUrl(file.name).data.publicUrl,
        }));
      setDemos(filesWithUrls);
      setLoading(false);
    };

    fetchDemos();
  }, []);

  // CHANGEMENT: On enveloppe les fonctions de contrôle dans useCallback
  const handleNext = useCallback(() => {
    if (demos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % demos.length);
  }, [demos.length]);

  const handlePrev = useCallback(() => {
    if (demos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + demos.length) % demos.length);
  }, [demos.length]);

  // 2. Gestion du lecteur audio
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const updateProgress = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    // CHANGEMENT: On utilise directement la fonction handleNext de useCallback
    const handleEnded = () => {
      // Vérifie si c'est la dernière piste
      if (currentIndex === demos.length - 1) {
        setIsPlaying(false); // Arrête la lecture
        // Optionnel : remettre au début visuellement ?
        // setCurrentIndex(0);
        // setCurrentTime(0);
      } else {
        // Ce n'est pas la fin, passe à la suivante
        setCurrentIndex((prev) => prev + 1);
        // Assurez-vous que la lecture continue si elle était active
        // L'autre useEffect [currentIndex, demos, isPlaying] s'en chargera
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      // Nettoyage des listeners play/pause si nécessaire
      audio.removeEventListener("play", () => setIsPlaying(true));
      audio.removeEventListener("pause", () => setIsPlaying(false));
    };
    // CHANGEMENT : Ajout de currentIndex et demos.length aux dépendances pour handleEnded
  }, [currentIndex, demos.length]);

  // ... (le reste du composant ne change pas) ...
  // Réaction au changement de piste (important pour démarrer la lecture suivante)
  useEffect(() => {
    const audio = audioRef.current;
    // Vérifications initiales
    if (!audio || demos.length === 0 || currentIndex >= demos.length) {
      // Si pas d'audio, pas de démos, ou index invalide, on ne fait rien
      if (audio && demos.length === 0) audio.pause(); // S'assurer qu'il s'arrête si la liste devient vide
      return;
    }

    const currentTrackUrl = demos[currentIndex].publicURL;
    let shouldPlay = isPlaying; // Garde l'état de lecture désiré

    // Si l'URL demandée est différente de celle en cours
    if (audio.src !== currentTrackUrl) {
      audio.pause(); // **Pause explicite AVANT de changer la source**
      audio.src = currentTrackUrl;
      setCurrentTime(0); // Réinitialise le temps pour la nouvelle piste
      setDuration(0); // Réinitialise la durée (sera mise à jour par loadedmetadata)
      // Si on change de piste (manuellement ou via 'next'), on veut généralement qu'elle joue
      // sauf si l'utilisateur avait explicitement mis en pause avant de cliquer sur next/prev
      // Si isPlaying était déjà true avant le changement, on veut continuer à jouer.
      // Si on sélectionne une nouvelle piste via handleSelectTrack, isPlaying est mis à true.
      // Donc, on se base sur l'état isPlaying actuel.
    }

    // Gérer la lecture/pause en fonction de l'état isPlaying
    if (shouldPlay) {
      // Tenter de jouer. L'événement 'play' mettra à jour isPlaying si succès.
      audio.play().catch((e) => {
        console.error("Erreur de lecture:", e);
        setIsPlaying(false); // S'assure que l'état reflète l'échec
      });
    } else {
      // Si shouldPlay est false, on met en pause. L'événement 'pause' mettra à jour isPlaying.
      audio.pause();
    }

    // S'exécute quand l'index, la liste des démos ou l'état de lecture change
  }, [currentIndex, demos, isPlaying]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSelectTrack = (index: number) => {
    setCurrentIndex(index);
    if (!isPlaying) setIsPlaying(true);
  };
  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const progressContainer = event.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  if (loading)
    return <div className="p-4 text-center opacity-70">Chargement...</div>;
  if (demos.length === 0)
    return (
      <div className="p-4 text-center opacity-70">Aucun essai à écouter.</div>
    );

  const currentTrack = demos[currentIndex];

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
            {formatRelativeTime(currentTrack.created_at)}
          </p>
          {/* Barre de progression */}
          <div className="mt-2 space-y-1">
            <div
              className="h-2 w-full bg-black/10 dark:bg-white/10 rounded cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-2 bg-primary rounded"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />
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
        <button onClick={handlePrev} className="control-btn">
          <BackwardIcon className="h-5 w-5" />
        </button>
        <button onClick={handlePlayPause} className="control-btn play-btn">
          {isPlaying ? (
            <PauseIcon className="h-8 w-8" />
          ) : (
            <PlayIcon className="h-8 w-8" />
          )}
        </button>
        <button onClick={handleNext} className="control-btn">
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
                className={`w-full text-left p-2 rounded-md flex items-center gap-3 ${
                  currentIndex === index ? "bg-primary/10" : "hover:bg-white/5"
                }`}
              >
                {currentIndex === index && isPlaying ? (
                  <PauseIcon className="h-5 w-5 text-primary flex-shrink-0" />
                ) : (
                  <PlayIcon className="h-5 w-5 text-primary/70 flex-shrink-0" />
                )}
                <span className="flex-1 truncate text-sm">
                  Essai #{demos.length - index}
                </span>
                <span className="text-xs opacity-60">
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
          transition: background-color 0.2s;
          color: var(--color-fg);
          background-color: transparent;
        }
        .control-btn:hover { background-color: oklch(from var(--color-fg) l c h / 0.1); }
        .control-btn:not(.play-btn) { width: 2.5rem; height: 2.5rem; }
        .play-btn { 
            width: 4rem; height: 4rem; 
            background-color: var(--color-primary); 
            color: white;
        }
        .play-btn:hover { background-color: oklch(from var(--color-primary) l c h / 0.9); }
      `}</style>
    </div>
  );
}
