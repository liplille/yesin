// src/components/DemoRecorder.tsx
import {
  MicrophoneIcon,
  StopCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useRecorder } from "../hooks/useRecorder";
import Toast from "./Toast";
import { Link } from "react-router-dom";
// On importe le visualiseur qui est déjà dans CreatePitchPage
import { SoundWaveBars } from "../pages/CreatePitchPage";
import { useEffect } from "react";

export function DemoRecorder() {
  const {
    status,
    audioBlob,
    countdown,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    sendAudio,
    setError,
  } = useRecorder(); // conserve l’API actuelle du hook

  const handleSend = () => {
    // Pour la démo, on envoie dans un bucket "demopitches"
    sendAudio("demopitches");
  };

  // ➕ NOUVEAU : notifier la playlist quand l’envoi est réussi
  useEffect(() => {
    if (status === "success") {
      window.dispatchEvent(
        new CustomEvent("demo:uploaded", {
          detail: { bucket: "demopitches" },
        })
      );
    }
  }, [status]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/5 p-5 shadow-lg dark:border-white/10">
      <h4 className="mb-4 text-lg font-bold">À vous d&apos;essayer !</h4>

      {status === "idle" && (
        <div className="flex items-center gap-3">
          <button
            onClick={startRecording}
            className="btn rounded-full bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            <MicrophoneIcon className="h-5 w-5 inline-block mr-2" />
            Enregistrer
          </button>
          <div className="text-sm text-fg/70">Jusqu’à 59 secondes</div>
        </div>
      )}

      {status === "recording" && (
        <div className="flex flex-col items-center gap-4">
          <SoundWaveBars isActive={true} />
          <button
            onClick={stopRecording}
            className="btn rounded-full bg-red-600 px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            <StopCircleIcon className="h-5 w-5 inline-block mr-2" />
            Arrêter
          </button>
          <div className="text-2xl font-bold tabular-nums animate-pulse text-red-500">
            0:{countdown.toString().padStart(2, "0")}
          </div>
        </div>
      )}

      {status === "recorded" && audioBlob && (
        <div>
          <audio
            src={URL.createObjectURL(audioBlob)}
            controls
            className="w-full mb-4"
          />
          <div className="flex justify-center gap-4">
            <button
              onClick={resetRecording}
              className="inline-flex items-center justify-center gap-2 text-sm underline opacity-80 hover:opacity-100"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Recommencer
            </button>
            <button
              onClick={handleSend}
              className="btn rounded-full bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90"
            >
              <PaperAirplaneIcon className="h-5 w-5 inline-block mr-2" />
              Envoyer
            </button>
          </div>
        </div>
      )}

      {(status === "uploading" || status === "success") && (
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "uploading" && (
            <p className="animate-pulse">Envoi en cours...</p>
          )}
          {status === "success" && (
            <div className="text-green-500 flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6" />
              <span>Enregistrement envoyé avec succès !</span>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs opacity-70">
        Ceci est une démo. Votre enregistrement sera sauvegardé pendant 7 jours.
        Prêt à enregistrer votre vraie publicité audio ?{" "}
        <Link to="/welcome" className="underline hover:text-primary">
          Enregistrez votre annonce officielle maintenant
        </Link>
        .
      </p>

      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
