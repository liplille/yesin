// src/pages/CreatePitchPage.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom"; // Importer useOutletContext
import { supabase } from "../lib/supabaseClient";
import Toast from "../components/Toast";
import {
  StopCircleIcon,
  PlayCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  MapPinIcon,
  MicrophoneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import type { RootOutletContext } from "../layout/RootLayout"; // Importer le type du contexte

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

// Définir correctement les props pour SoundWaveBars
type SoundWaveBarsProps = {
  color?: string;
  barWidth?: number;
  gap?: number;
  speedMin?: number;
  speedMax?: number;
  dimWhenIdle?: boolean;
  isActive?: boolean;
};

/**
 * Visualizer à barres qui s'adapte à la largeur de son conteneur.
 */
export function SoundWaveBars({
  color = "var(--color-primary)",
  barWidth = 1,
  gap = 1.5,
  speedMin = 0.2,
  speedMax = 0.7,
  dimWhenIdle = false,
  isActive = true,
}: SoundWaveBarsProps) {
  // Utiliser le type de props défini
  const containerRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = container.clientWidth;
      const fullBarWidth = barWidth + gap * 2;
      const newCount = Math.floor(containerWidth / fullBarWidth);
      setBarCount(newCount);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [barWidth, gap]);

  const bars = useMemo(() => Array.from({ length: barCount }), [barCount]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || barCount === 0) return;
    const nodes = root.querySelectorAll<HTMLDivElement>(".swb__bar");
    nodes.forEach((el, idx) => {
      const dur = Math.random() * (speedMax - speedMin) + speedMin;
      const delay = Math.random() * dur * 0.9 * (idx % 2 === 0 ? 1 : -1);
      el.style.animationDuration = `${dur}s`;
      el.style.animationDelay = `${delay}s`;
    });
  }, [barCount, speedMin, speedMax]);

  return (
    <div
      ref={containerRef}
      className={[
        "swb",
        isActive ? "is-active" : "",
        !isActive && dimWhenIdle ? "is-idle" : "",
      ].join(" ")}
      style={
        {
          "--swb-color": color,
          "--swb-bar-w": `${barWidth}px`,
          "--swb-gap": `${gap}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div
        className="swb__wave"
        role="img"
        aria-label="Visualiseur d'onde sonore"
      >
        {bars.map((_, i) => (
          <div className="swb__bar" key={i} />
        ))}
      </div>
      <style>{`
        /* Styles pour SoundWaveBars */
        .swb { display: grid; place-items: center; width: 100%; min-height: 90px; overflow: hidden; }
        .swb.is-idle { opacity: 0.6; }
        .swb__wave { height: 70px; display: flex; align-items: center; justify-content: center; pointer-events: none; user-select: none; will-change: transform; }
        .swb__bar { background: var(--swb-color, #f32968); width: var(--swb-bar-w, 1px); margin: 0 var(--swb-gap, 1.5px); height: 10px; animation-name: swb-wave-lg; animation-iteration-count: infinite; animation-timing-function: ease-in-out; animation-direction: alternate; flex-shrink: 0; }
        .swb__bar:nth-child(-n+15), .swb__bar:nth-last-child(-n+15) { animation-name: swb-wave-md; }
        .swb__bar:nth-child(-n+5), .swb__bar:nth-last-child(-n+5) { animation-name: swb-wave-sm; }
        .swb:not(.is-active) .swb__bar { animation-play-state: paused; }
        @keyframes swb-wave-sm { 0% { opacity: .35; height: 10px; } 100% { opacity: 1; height: 25px; } }
        @keyframes swb-wave-md { 0% { opacity: .35; height: 15px; } 100% { opacity: 1; height: 50px; } }
        @keyframes swb-wave-lg { 0% { opacity: .35; height: 15px; } 100% { opacity: 1; height: 70px; } }
        @media (prefers-reduced-motion: reduce) { .swb__bar { animation-duration: .001s !important; animation-iteration-count: 1 !important; } }
      `}</style>
    </div>
  );
}

export default function CreatePitchPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(59);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const { geoCoords, geoLocate } = useOutletContext<RootOutletContext>();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/welcome");
    })();
  }, [navigate]);

  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleStopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  useEffect(() => {
    const fromMagic = sessionStorage.getItem("cameFromMagic") === "1";
    const alreadyFired =
      sessionStorage.getItem("conv2:completeRegistration:fired") === "1";

    if (fromMagic && !alreadyFired && window.fbq) {
      window.fbq("track", "CompleteRegistration");
      sessionStorage.setItem("conv2:completeRegistration:fired", "1");
      sessionStorage.removeItem("cameFromMagic");
    }
  }, []);

  const handleStartRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setCountdown(59);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      let options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "audio/mp4" };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: "audio/wav" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              throw new Error("Aucun format d'enregistrement audio supporté.");
            }
          }
        }
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (chunks.length > 0) {
          const recordedBlob = new Blob(chunks, { type: options.mimeType });
          setAudioBlob(recordedBlob);
        } else {
          setError("L'enregistrement n'a produit aucune donnée audio.");
        }
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };
      recorder.onerror = (event) => {
        console.error("Erreur MediaRecorder:", event);
        // @ts-ignore
        const errorEvent = event as Event & { error?: DOMException };
        setError(
          `Erreur d'enregistrement: ${errorEvent.error?.name || "inconnue"}`
        );
        setIsRecording(false);
        if (stream) stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      if (window.fbq && !sessionStorage.getItem("conv3:startTrial:fired")) {
        window.fbq("track", "StartTrial");
        sessionStorage.setItem("conv3:startTrial:fired", "1");
      }
      setIsRecording(true);
    } catch (err: any) {
      let errMsg = "Impossible de démarrer l'enregistrement.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errMsg = "L'accès au micro est nécessaire. Veuillez l'autoriser.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errMsg = "Aucun microphone trouvé.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      setIsRecording(false);
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    setIsRecording(false);
  };

  const handleSendPitch = async () => {
    if (!audioBlob) {
      setError("Aucun pitch enregistré à envoyer.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Veuillez vous reconnecter pour envoyer votre pitch.");
      return;
    }

    setIsSending(true);
    setError(null);

    const mimeType = audioBlob.type;
    let extension = "bin";
    if (mimeType.includes("webm")) extension = "webm";
    else if (mimeType.includes("mp4") || mimeType.includes("aac"))
      extension = "m4a";
    else if (mimeType.includes("wav")) extension = "wav";
    else if (mimeType.includes("ogg")) extension = "ogg";

    const fileName = `pitch-${user.id}-${Date.now()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("pitches")
        .upload(fileName, audioBlob, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("pitches_metadata")
        .insert({
          pitch_file_name: fileName,
          user_id: user.id,
          latitude: geoCoords?.lat ?? null,
          longitude: geoCoords?.lon ?? null,
        });
      if (insertError) throw insertError;

      sessionStorage.setItem("audioSubmitted", "true");
      navigate("/thank-you/submitted", {
        replace: true,
        state: { audioSubmitted: true },
      });
    } catch (err: any) {
      console.error("Erreur lors de l'envoi:", err);
      setError(
        `Erreur d'envoi: ${err?.message || "Une erreur inconnue est survenue."}`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.onerror = null;
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }
    }
    if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    setAudioBlob(null);
    setCountdown(59);
    setIsRecording(false);
    setMediaStream(null);
    mediaRecorderRef.current = null;
    setIsSending(false);
    setError(null);
  };

  const geoStatusDisplay = useMemo(() => {
    if (geoCoords) {
      return `Position prête`;
    }
    return "Localisation non active";
  }, [geoCoords]);

  const isSendButtonDisabled = isSending;

  return (
    <div className="mx-auto max-w-2xl py-12 text-center sm:py-16">
      <h1 className="text-3xl font-extrabold sm:text-4xl mb-2">
        Votre micro est prêt ! 🎤 Enregistrez votre publicité audio gratuite.{" "}
      </h1>
      <p className="mb-8 text-base sm:text-lg opacity-80">
        Partagez l'histoire et la passion de votre projet avec la communauté. A
        vous de marquer les esprits !
      </p>
      {/* --- Conteneur principal du bloc enregistreur --- */}
      <div className="rounded-2xl border border-black/10 bg-white/5 p-4 sm:p-6 shadow-2xl dark:border-white/10 flex flex-col items-center justify-center min-h-[300px]">
        {/* --- État Initial (Optimisé) --- */}
        {!isRecording && !audioBlob && (
          <div className="flex flex-col items-center gap-6 w-full text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-2 shadow-inner">
              <MicrophoneIcon className="h-16 w-16 text-primary drop-shadow-lg" />
            </div>
            <button
              onClick={handleStartRecording}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary to-purple-600 px-8 py-4 font-bold text-white text-lg shadow-lg hover:opacity-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transition-transform transform hover:scale-[1.03] active:scale-100 animate-pulse-slow"
            >
              <PlayCircleIcon className="h-7 w-7" />
              Lancer l'enregistrement
            </button>
            <div className="text-sm opacity-70">Jusqu'à 59 secondes</div>
          </div>
        )}

        {/* --- État Enregistrement --- */}
        {isRecording && (
          <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
            <SoundWaveBars isActive={isRecording} />
            <button
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 font-bold text-white text-base sm:px-6 sm:py-3 sm:text-lg hover:opacity-90 transition-transform hover:scale-105"
            >
              <StopCircleIcon className="h-6 w-6" />
              Arrêter
            </button>
            <div className="text-2xl font-bold tabular-nums animate-pulse text-red-500">
              0:{countdown.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* --- État Pitch Prêt (Alternative Layout) --- */}
        {audioBlob && !isRecording && (
          // Conteneur principal avec padding vertical pour l'espacement interne
          <div className="flex w-full flex-col items-center gap-4 py-4 sm:py-6">
            {" "}
            {/* Ajout de padding vertical py-* */}
            {/* Titre */}
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-2">
              {" "}
              {/* Marge basse mb-2 */}
              <CheckCircleIcon className="h-7 w-7 text-green-500" />
              <span>Votre pitch est prêt !</span>
            </h3>
            {/* Lecteur audio */}
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="w-full max-w-md mx-auto rounded-lg"
            />
            {/* Statut Géoloc + Bouton Activer (groupés) - Ajouter marge mt-3 */}
            <div className="text-sm opacity-80 flex items-center justify-center gap-1.5 mt-3">
              {" "}
              {/* Marge haute mt-3 */}
              <MapPinIcon
                className={`h-4 w-4 ${
                  geoCoords ? "text-green-500" : "text-gray-400"
                }`}
              />
              <span>{geoStatusDisplay}</span>
              {!geoCoords && geoLocate && (
                <button
                  onClick={geoLocate}
                  className="ml-1 underline text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  disabled={isSending}
                >
                  (Activer ?)
                </button>
              )}
            </div>
            {/* Séparateur Visuel (Optionnel) - Ajouté pour séparer les infos des actions */}
            <hr className="w-1/2 border-white/10 my-4 sm:my-6" />
            {/* Section Actions (Boutons Envoyer et Recommencer) */}
            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              {/* Bouton Envoyer Primaire */}
              <button
                onClick={handleSendPitch}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-purple-600 px-6 py-3 font-bold text-white text-base shadow-lg hover:opacity-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transition-transform transform hover:scale-[1.03] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSendButtonDisabled}
              >
                {isSending ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
                {isSending ? "Envoi..." : "Envoyer mon pitch"}
              </button>

              {/* Bouton Recommencer Secondaire */}
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 mt-1" // Conserve le style discret
                disabled={isSending}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Recommencer
              </button>
            </div>
            {/* Texte informatif (si nécessaire) - Peut être placé après les boutons */}
            {!geoCoords && !isSending && (
              <p className="text-xs opacity-50 mt-4">
                (Conseil : Ajoutez la localisation pour maximiser votre
                visibilité locale.)
              </p>
            )}
          </div>
        )}
      </div>
      {/* Fin du conteneur principal du bloc */}
      <div className="mt-12 text-left">
        <h4 className="text-center font-bold mb-4">
          Nos conseils pour un pitch réussi ✨
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">🤫</span>
            <p className="font-semibold mt-1">Trouvez un endroit calme</p>
            <p className="opacity-70">
              Évitez les bruits de fond pour que votre voix soit claire et
              nette.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">😊</span>
            <p className="font-semibold mt-1">Parlez avec le sourire</p>
            <p className="opacity-70">
              Votre énergie s'entend ! Soyez passionné, votre audience le
              ressentira.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">🌟</span>
            <p className="font-semibold mt-1">Soyez vous-même</p>
            <p className="opacity-70">
              C'est votre histoire. L'authenticité est ce qui crée la connexion.
            </p>
          </div>
        </div>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
      {/* Ajouter une animation CSS pour le pulse lent */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
