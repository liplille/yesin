// src/pages/CreatePitchPage.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Toast from "../components/Toast";
import {
  MicrophoneIcon,
  StopCircleIcon,
  PlayCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

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
}: {
  color?: string;
  barWidth?: number;
  gap?: number;
  speedMin?: number;
  speedMax?: number;
  dimWhenIdle?: boolean;
  isActive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(0);

  // Recalculer le nombre de barres quand la taille du conteneur change
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

  // Appliquer les délais d'animation aléatoires
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
        .swb {
          display: grid;
          place-items: center;
          width: 100%;
          min-height: 90px;
          overflow: hidden;
        }
        .swb.is-idle { opacity: 0.6; }
        .swb__wave {
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
          will-change: transform;
        }
        .swb__bar {
          background: var(--swb-color, #f32968);
          width: var(--swb-bar-w, 1px);
          margin: 0 var(--swb-gap, 1.5px);
          height: 10px;
          animation-name: swb-wave-lg;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          animation-direction: alternate;
          flex-shrink: 0;
        }
        .swb__bar:nth-child(-n+15),
        .swb__bar:nth-last-child(-n+15) {
          animation-name: swb-wave-md;
        }
        .swb__bar:nth-child(-n+5),
        .swb__bar:nth-last-child(-n+5) {
          animation-name: swb-wave-sm;
        }
        .swb:not(.is-active) .swb__bar {
          animation-play-state: paused;
        }

        @keyframes swb-wave-sm {
          0%   { opacity: .35; height: 10px; }
          100% { opacity: 1;   height: 25px; }
        }
        @keyframes swb-wave-md {
          0%   { opacity: .35; height: 15px; }
          100% { opacity: 1;   height: 50px; }
        }
        @keyframes swb-wave-lg {
          0%   { opacity: .35; height: 15px; }
          100% { opacity: 1;   height: 70px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .swb__bar {
            animation-duration: .001s !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CreatePitchPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(59);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Préparez votre voix...");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const navigate = useNavigate();

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
  }, [isRecording]);

  // CONVERSION 2 — Validation email (arrivée sur create-pitch)
  useEffect(() => {
    if (
      window.fbq &&
      !sessionStorage.getItem("conv2:completeRegistration:fired")
    ) {
      window.fbq("track", "CompleteRegistration");
      sessionStorage.setItem("conv2:completeRegistration:fired", "1");
    }
  }, []);

  const handleStartRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setCountdown(59);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/m4a" }));
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      // CONVERSION 3 — Début enregistrement (clic)
      if (window.fbq && !sessionStorage.getItem("conv3:startTrial:fired")) {
        window.fbq("track", "StartTrial");
        sessionStorage.setItem("conv3:startTrial:fired", "1");
      }
      setStatusMessage("Enregistrement en cours...");
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur d'accès au micro:", err);
      setError(
        "L'accès au micro est nécessaire. Veuillez l'autoriser dans les paramètres de votre navigateur."
      );
      setIsRecording(false);
      setMediaStream(null);
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setCountdown(59);
    setStatusMessage("Écoutez votre pitch avant de l'envoyer.");
  };

  const handleSendPitch = async () => {
    if (!audioBlob) {
      setError("Aucun pitch enregistré à envoyer.");
      return;
    }
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setError("Veuillez vous reconnecter pour envoyer votre pitch.");
      return;
    }

    const fileName = `pitch-${user.id}-${Date.now()}.m4a`;
    const { error: uploadError } = await supabase.storage
      .from("pitches")
      .upload(fileName, audioBlob);

    if (uploadError) {
      setError(uploadError.message);
    } else {
      sessionStorage.setItem("audioSubmitted", "true");
      navigate("/thank-you/submitted", {
        replace: true,
        state: { audioSubmitted: true },
      });
    }
  };

  const handleReset = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setAudioBlob(null);
    setCountdown(59);
    setStatusMessage("Préparez votre voix...");
    setIsRecording(false);
    setMediaStream(null);
  };

  return (
    <div className="mx-auto max-w-2xl py-12 text-center sm:py-16">
      <div className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </div>

      <h1 className="text-3xl font-extrabold sm:text-4xl mb-2">
        Votre micro est prêt ! 🎤 Enregistrez votre publicité audio gratuite.{" "}
      </h1>
      <p className="mb-8 text-base sm:text-lg opacity-80">
        Partagez l'histoire et la passion de votre projet avec la communauté. A
        vous de marquer les esprits !
      </p>

      <div className="rounded-2xl border border-black/10 bg-white/5 p-4 sm:p-6 shadow-2xl dark:border-white/10">
        {!isRecording && !audioBlob && (
          <div className="flex flex-col items-center gap-4">
            <MicrophoneIcon className="h-16 w-16 text-primary opacity-50" />
            <button
              onClick={handleStartRecording}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-white text-base sm:px-6 sm:py-3 sm:text-lg hover:opacity-90 transition-transform hover:scale-105"
            >
              <PlayCircleIcon className="h-6 w-6" />
              Lancer l'enregistrement
            </button>
            <div className="text-sm opacity-70 tabular-nums">0:59</div>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <SoundWaveBars isActive={isRecording} dimWhenIdle />
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

        {audioBlob && !isRecording && (
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-xl font-bold">Votre pitch est prêt !</h3>
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="w-full"
            />
            <div className="mt-4 flex w-full flex-col-reverse sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 text-sm underline opacity-80 hover:opacity-100"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Recommencer
              </button>
              <button
                onClick={handleSendPitch}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-white text-base sm:px-6 sm:py-3 sm:text-lg hover:opacity-90 transition-transform hover:scale-105"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                Envoyer mon pitch
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
