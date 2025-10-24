// src/components/DemoRecorder.tsx
import React, { useEffect, useCallback } from "react"; // Import React séparément
import {
  MicrophoneIcon,
  StopCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowPathIcon as SpinnerIcon, // Renommé pour éviter conflit
} from "@heroicons/react/24/solid"; // Import des icônes
import { Link } from "react-router-dom";
import Toast from "./Toast";
// Correction : Importer SoundWaveBars depuis CreatePitchPage où il est défini
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
  } = useRecorder(); // Durée par défaut de 59s est gérée dans le hook

  // Utiliser useCallback pour stabiliser la fonction stopRecording passée en dépendance de useEffect
  const memoizedStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleSend = () => {
    sendAudio("demopitches"); // Bucket 'demopitches'
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
      // Vérifier si on est toujours en train d'enregistrer avant d'arrêter
      if (status === "recording") {
        memoizedStopRecording();
      }
    });
  }, [status, memoizedStopRecording]); // Ajouter memoizedStopRecording aux dépendances

  // Gestionnaire d'erreur pour l'élément audio
  const handleAudioError = useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const audioEl = event.currentTarget;
      const mediaError = audioEl.error;
      let errorMessage = "Erreur de lecture audio inconnue.";

      if (mediaError) {
        console.error("Audio playback error details:", mediaError);
        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Lecture audio annulée.";
            break;
          case mediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Erreur réseau lors du chargement audio.";
            break;
          case mediaError.MEDIA_ERR_DECODE:
            errorMessage =
              "Erreur de décodage audio (fichier corrompu ou format non supporté).";
            break;
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Format audio non supporté par votre navigateur.";
            break;
          default:
            errorMessage =
              mediaError.message || `Erreur audio (code ${mediaError.code}).`;
        }
      }
      setError(errorMessage); // Met à jour l'état d'erreur géré par le hook
    },
    [setError] // Dépendance à setError du hook
  );

  const isRequestingPermission = status === "requesting";
  const isUploading = status === "uploading";
  const isSuccess = status === "success";
  const isSuccessFading = status === "success-fading"; // Variable pour le nouvel état

  return (
    <div className="rounded-2xl border border-black/10 bg-white/5 p-4 sm:p-5 shadow-lg dark:border-white/10 flex flex-col h-full">
      <h4 className="mb-4 text-lg font-bold text-center flex-shrink-0">
        À vous d&apos;essayer !
      </h4>

      <div className="flex-grow flex flex-col justify-center items-center min-h-[160px]">
        {/* --- État Initial ou Demande Permission --- */}
        {(status === "idle" || isRequestingPermission) && (
          <div className="flex flex-col items-center justify-center gap-4 w-full">
            {/* Correction : Passer les props correctement */}
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

        {/* --- État Enregistrement --- */}
        {status === "recording" && !isRequestingPermission && (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Correction : Passer la prop correctement */}
            <SoundWaveBars isActive={true} />
            <button
              onClick={memoizedStopRecording} // Utilise la fonction stable
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

        {/* --- État Enregistré (Blob prêt) --- */}
        {status === "recorded" && audioBlob && (
          <div className="flex flex-col items-center gap-4 w-full px-0 sm:px-2">
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="w-full mb-4"
              onError={handleAudioError} // Gestionnaire d'erreur ajouté ici
            />
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full">
              <button
                onClick={resetRecording} // Utilise la fonction stable
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

        {/* --- États Uploading, Success, Success-Fading --- */}
        {(isUploading || isSuccess || isSuccessFading) && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            {isUploading && <p className="animate-pulse">Envoi en cours...</p>}
            {(isSuccess || isSuccessFading) && (
              <div
                className={`text-green-500 flex items-center gap-2 transition-opacity duration-300 ease-out ${
                  isSuccessFading ? "opacity-0" : "opacity-100"
                }`}
              >
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
