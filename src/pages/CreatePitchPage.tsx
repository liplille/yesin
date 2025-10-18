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
//import { createNoise2D } from "simplex-noise";

// VISUALISEUR 1 : Barres verticales nettes avec réflexion
/*
function BarVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioData = useRef<Uint8Array | null>(null);
  const smoothedData = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d")!;
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    audioData.current = new Uint8Array(bufferLength);
    smoothedData.current = new Float32Array(bufferLength);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(audioData.current!);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 4;
      const barSpacing = 2;
      const totalBarWidth = barWidth + barSpacing;
      const numBars = Math.floor(canvas.width / totalBarWidth);
      const centerY = canvas.height / 2;

      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * bufferLength);
        const barHeight = audioData.current![dataIndex] / 2.5;
        smoothedData.current![i] +=
          (barHeight - smoothedData.current![i]) * 0.2;
        const finalBarHeight = smoothedData.current![i];

        const x = i * totalBarWidth;

        canvasCtx.beginPath();
        canvasCtx.moveTo(x + barWidth / 2, centerY);
        canvasCtx.lineTo(x + barWidth / 2, centerY - finalBarHeight);
        canvasCtx.strokeStyle = primaryColor;
        canvasCtx.lineWidth = barWidth;
        canvasCtx.lineCap = "round";
        canvasCtx.stroke();

        canvasCtx.beginPath();
        canvasCtx.moveTo(x + barWidth / 2, centerY);
        canvasCtx.lineTo(x + barWidth / 2, centerY + finalBarHeight * 0.4);
        canvasCtx.globalAlpha = 0.3;
        canvasCtx.stroke();
        canvasCtx.globalAlpha = 1.0;
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      audioCtx.close();
    };
  }, [stream]);

  return (
    <canvas ref={canvasRef} width="300" height="150" className="mx-auto" />
  );
}

// VISUALISEUR 2 : Circulaire inspiré du CodePen
function CircularVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const noise2D = useRef(createNoise2D());
  const noiseTime = useRef(0);

  useEffect(() => {
    if (!stream || !canvasRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d")!;
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();

    const config = {
      circleRadius: 60,
      multiplier: 30,
      glow: 10,
    };

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const averageFrequency = dataArray.reduce((a, b) => a + b) / bufferLength;
      noiseTime.current += averageFrequency / 100000;
      const noiseRotate = noise2D.current(10, noiseTime.current);

      const points = bufferLength * 0.75;

      for (let i = 0; i < points; i++) {
        const avg = dataArray[i];
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / points + noiseRotate;
        const x1 = canvas.width / 2 + config.circleRadius * Math.cos(angle);
        const y1 = canvas.height / 2 + config.circleRadius * Math.sin(angle);
        const lineLength = avg * config.multiplier * 0.05;
        const x2 =
          canvas.width / 2 +
          (config.circleRadius + lineLength) * Math.cos(angle);
        const y2 =
          canvas.height / 2 +
          (config.circleRadius + lineLength) * Math.sin(angle);
        const fatLineLength = Math.pow(lineLength * 0.09, 2);
        const x3 =
          canvas.width / 2 +
          (config.circleRadius + fatLineLength) * Math.cos(angle);
        const y3 =
          canvas.height / 2 +
          (config.circleRadius + fatLineLength) * Math.sin(angle);
        const noiseDistortion =
          noise2D.current(y1 / 100, noiseTime.current) * 10;

        canvasCtx.beginPath();
        canvasCtx.lineCap = "round";
        canvasCtx.shadowBlur = config.glow;
        const lineOpacity = Math.min(1, avg / 100);
        const lineColor = `oklch(from ${primaryColor} l c h / ${lineOpacity})`;
        canvasCtx.strokeStyle = lineColor;
        canvasCtx.shadowColor = lineColor;
        canvasCtx.lineWidth = 1;
        canvasCtx.moveTo(x1 + noiseDistortion, y1 + noiseDistortion);
        canvasCtx.lineTo(x2 + noiseDistortion, y2 + noiseDistortion);
        canvasCtx.stroke();

        canvasCtx.beginPath();
        canvasCtx.lineWidth = 4;
        const fatLineOpacity = Math.min(1, avg / 150);
        const fatLineColor = `oklch(from ${primaryColor} l c h / ${fatLineOpacity})`;
        canvasCtx.strokeStyle = fatLineColor;
        canvasCtx.shadowColor = fatLineColor;
        canvasCtx.moveTo(x1 + noiseDistortion, y1 + noiseDistortion);
        canvasCtx.lineTo(x3 + noiseDistortion, y3 + noiseDistortion);
        canvasCtx.stroke();
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      audioCtx.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width="400"
      height="300"
      className="mx-auto w-full max-w-sm"
    />
  );
}
*/

/**
 * Visualizer à barres aléatoires (non audio-réactif, comme ton extrait).
 * Props utiles: count (nb de barres), color, barWidth, speedMin/Max.
 */
function SoundWaveBars({
  count = 160, // ← ajuste la longueur
  color = "#f32968", // ← couleur des barres
  barWidth = 1, // ← largeur d'une barre (px)
  gap = 1.5, // ← espace horizontal (px)
  speedMin = 0.2, // ← vitesse min (s)
  speedMax = 0.7, // ← vitesse max (s)
  dimWhenIdle = false, // ← si true, baisse l’opacité via .is-idle
  isActive = true, // ← active/stoppe l’animation via CSS
}: {
  count?: number;
  color?: string;
  barWidth?: number;
  gap?: number;
  speedMin?: number;
  speedMax?: number;
  dimWhenIdle?: boolean;
  isActive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bars = useMemo(() => Array.from({ length: count }), [count]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLDivElement>(".swb__bar");

    // Durées + décalages aléatoires
    nodes.forEach((el, idx) => {
      const dur = Math.random() * (speedMax - speedMin) + speedMin; // (max - min) + min
      const delay = Math.random() * dur * 0.9 * (idx % 2 === 0 ? 1 : -1);
      el.style.animationDuration = `${dur}s`;
      el.style.animationDelay = `${delay}s`;
    });
  }, [count, speedMin, speedMax]);

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
          // variables CSS pour personnalisation rapide
          "--swb-color": color,
          "--swb-bar-w": `${barWidth}px`,
          "--swb-gap": `${gap}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className="swb__wave" role="img" aria-label="Sound wave visualizer">
        {bars.map((_, i) => (
          <div className="swb__bar" key={i} />
        ))}
      </div>

      {/* Styles encapsulés */}
      <style>{`
        .swb {
          display: grid;
          place-items: center;
          width: 100%;
          /* hauteur du bloc : aligne-toi sur tes besoins */
          min-height: 90px;
        }
        .swb.is-idle { opacity: 0.6; }
        .swb__wave {
          height: 70px;                 /* hauteur max d'une barre (lg) */
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
          height: 10px;                 /* base */
          animation-name: swb-wave-lg;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          animation-direction: alternate;
        }
        /* zones proches du centre : medium */
        .swb__bar:nth-child(-n+7),
        .swb__bar:nth-last-child(-n+7) {
          animation-name: swb-wave-md;
        }
        /* tout à fait au centre : small */
        .swb__bar:nth-child(-n+3),
        .swb__bar:nth-last-child(-n+3) {
          animation-name: swb-wave-sm;
        }
        /* pause propre quand isActive=false */
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

        /* Accessibilité : moins d'animation si l'utilisateur préfère */
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
      // On stocke le drapeau dans la session du navigateur
      sessionStorage.setItem("audioSubmitted", "true");
      navigate("/thank-you/submitted", {
        replace: true,
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
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </div>

      <h1 className="text-4xl font-extrabold mb-2">Le micro est à vous.</h1>
      <p className="mb-8 text-lg opacity-80">
        Racontez votre histoire en 59 secondes.
      </p>

      <div className="rounded-2xl border border-black/10 bg-white/5 p-6 shadow-2xl dark:border-white/10">
        {!isRecording && !audioBlob && (
          <div className="flex flex-col items-center gap-4">
            <MicrophoneIcon className="h-16 w-16 text-primary opacity-50" />
            <button
              onClick={handleStartRecording}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white text-lg hover:opacity-90 transition-transform hover:scale-105"
            >
              <PlayCircleIcon className="h-6 w-6" />
              Lancer l'enregistrement
            </button>
            <div className="text-sm opacity-70 tabular-nums">0:59</div>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center gap-8">
            {" "}
            {/* Augmentation de l'espace */}
            {/* <BarVisualizer stream={mediaStream} />
            <CircularVisualizer stream={mediaStream} /> */}
            <SoundWaveBars
              count={160} // 80..240 selon goût
              color="#f32968" // ta couleur
              barWidth={1} // 1..3 px
              gap={1.5} // écart horizontal
              isActive={isRecording} // optionnel: anime seulement en enregistrement
              dimWhenIdle // baisse l’opacité quand inactif
            />
            <button
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 font-bold text-white text-lg hover:opacity-90 transition-transform hover:scale-105"
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
            <div className="mt-4 flex w-full justify-center gap-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Recommencer
              </button>
              <button
                onClick={handleSendPitch}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white text-lg hover:opacity-90 transition-transform hover:scale-105"
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
