// src/components/DemoRecorder.tsx
import {
  MicrophoneIcon,
  StopCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowPathIcon as SpinnerIcon, // Icône utilisée comme spinner
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { useEffect, useCallback } from "react";
import Toast from "./Toast";
import { SoundWaveBars } from "../pages/CreatePitchPage";
import { useRecorder } from "../hooks/useRecorder";
import { requestAudioFocus, onAudioFocus } from "../utils/audioFocus";

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
  } = useRecorder();

  const memoizedStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleSend = () => {
    sendAudio("demopitches");
  };

  // Notifier la playlist de recharger quand un upload termine
  useEffect(() => {
    if (status === "success") {
      window.dispatchEvent(
        new CustomEvent("demo:uploaded", {
          detail: { bucket: "demopitches" },
        })
      );
    }
  }, [status]);

  // Quand on commence à enregistrer, on prend le focus audio (stoppe les lecteurs actifs)
  useEffect(() => {
    if (status === "recording") {
      requestAudioFocus("recorder");
    }
  }, [status]);

  // Si on perd le focus (un autre acteur prend la main), on stop l'enregistrement en cours
  useEffect(() => {
    return onAudioFocus("recorder", () => {
      if (status === "recording") {
        memoizedStopRecording();
      }
    });
  }, [status, memoizedStopRecording]);

  const isRequestingPermission = status === "requesting";

  return (
    <div className="rounded-2xl border border-black/10 bg-white/5 p-4 sm:p-5 shadow-lg dark:border-white/10 flex flex-col h-full">
      <h4 className="mb-4 text-lg font-bold text-center flex-shrink-0">
        À vous d&apos;essayer !
      </h4>

      <div className="flex-grow flex flex-col justify-center items-center min-h-[160px]">
        {(status === "idle" || status === "requesting") && (
          <div className="flex flex-col items-center justify-center gap-4 w-full">
            <SoundWaveBars isActive={false} dimWhenIdle={true} />
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={startRecording}
                className={`btn rounded-full bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90 ${
                  isRequestingPermission ? "opacity-70 cursor-not-allowed" : ""
                }`}
                disabled={isRequestingPermission}
              >
                {isRequestingPermission ? (
                  <SpinnerIcon className="h-5 w-5 inline-block mr-2 align-text-bottom animate-spin" />
                ) : (
                  <MicrophoneIcon className="h-5 w-5 inline-block mr-2 align-text-bottom" />
                )}
                {isRequestingPermission ? "Autorisation..." : "Enregistrer"}
              </button>
              <div className="text-xs sm:text-sm text-fg/70">
                Jusqu’à 59 secondes
              </div>
            </div>
          </div>
        )}

        {status === "recording" && !isRequestingPermission && (
          <div className="flex flex-col items-center gap-4 w-full">
            <SoundWaveBars isActive={true} />
            <button
              onClick={stopRecording}
              className="btn rounded-full bg-red-600 px-4 py-2 font-medium text-white transition hover:opacity-90"
            >
              <StopCircleIcon className="h-5 w-5 inline-block mr-2 align-text-bottom" />
              Arrêter
            </button>
            <div className="text-2xl font-bold tabular-nums animate-pulse text-red-500">
              0:{countdown.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {status === "recorded" && audioBlob && (
          <div className="flex flex-col items-center gap-4 w-full px-0 sm:px-2">
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="w-full mb-4"
            />
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full">
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
                <PaperAirplaneIcon className="h-5 w-5 inline-block mr-2 align-text-bottom" />
                Envoyer
              </button>
            </div>
          </div>
        )}

        {(status === "uploading" || status === "success") && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
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
      </div>

      <p className="mt-4 text-[11px] sm:text-xs opacity-70 text-center flex-shrink-0">
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
