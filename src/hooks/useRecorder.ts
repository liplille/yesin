// src/hooks/useRecorder.ts
import { useState, useEffect, useRef, useCallback } from "react"; // Ajout de useCallback
import { supabase } from "../lib/supabaseClient";

export type RecordingStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "error"
  | "uploading"
  | "success"
  | "success-fading"; // Nouvel état pour la transition

// --- NOUVEAU: Helper pour choisir le type MIME ---
function pickSupportedMime(): { mime: string; ext: string } {
  const candidates: Array<{ mime: string; ext: string }> = [
    // iOS Safari (AAC dans MP4/M4A) - Mettre mp4 en premier car plus standard
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/aac", ext: "aac" }, // AAC peut être distinct
    // Chrome/Firefox desktop et Android (Opus dans WebM)
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    // Fallback universel mais plus lourd
    { mime: "audio/wav", ext: "wav" },
  ];

  if (typeof window.MediaRecorder === "undefined") {
    console.warn("MediaRecorder n'est pas supporté par ce navigateur.");
    return { mime: "audio/wav", ext: "wav" }; // Fallback si MediaRecorder n'existe pas
  }

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      console.log(`Using supported MIME type: ${c.mime}`); // Log pour débogage
      return c;
    }
  }
  console.warn(
    "Aucun des types MIME préférés n'est supporté, fallback en WAV."
  );
  return { mime: "audio/wav", ext: "wav" }; // Fallback final
}
// --- Fin NOUVEAU ---

export function useRecorder({ duration = 59 } = {}) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(duration);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // --- NOUVEAU: Stocker le type MIME choisi ---
  const recordingOptions = useRef<{ mime: string; ext: string } | null>(null);
  // --- Fin NOUVEAU ---

  useEffect(() => {
    let interval: number | undefined;
    if (status === "recording") {
      interval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopRecording(); // Utilise stopRecording qui gère l'arrêt propre
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Dépendance stopRecording retirée car stable via useRef+useCallback implicite

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setCountdown(duration);
    setStatus("requesting");

    // --- MODIFICATION: Choisir le type MIME avant ---
    recordingOptions.current = pickSupportedMime();
    const { mime } = recordingOptions.current;
    console.log("Starting recording with options:", recordingOptions.current); // Log
    // --- Fin MODIFICATION ---

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // --- MODIFICATION: Utiliser le mime choisi ---
      // Vérifier si MediaRecorder est disponible
      if (typeof window.MediaRecorder === "undefined") {
        throw new Error("MediaRecorder n'est pas supporté par ce navigateur.");
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      // --- Fin MODIFICATION ---

      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // S'assurer qu'on ne pousse pas de chunks vides
          chunks.push(e.data);
        }
      };
      recorder.onstop = () => {
        // --- MODIFICATION: Utiliser le mime choisi pour le Blob ---
        if (chunks.length > 0) {
          // Créer le blob seulement si on a des données
          const completeBlob = new Blob(chunks, { type: mime });
          console.log(
            `Blob created with type: ${mime}, size: ${completeBlob.size}`
          ); // Log
          setAudioBlob(completeBlob);
          setStatus("recorded");
        } else {
          console.warn("Recording stopped but no data chunks received.");
          setError("Aucune donnée audio n'a été enregistrée.");
          setStatus("error"); // Passer en erreur si aucun chunk n'est reçu
        }
        // --- Fin MODIFICATION ---

        // Nettoyer le stream après l'arrêt, que le blob soit créé ou non
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.onerror = (event: Event) => {
        // Type Event générique
        // Gestionnaire d'erreur pour MediaRecorder
        console.error("MediaRecorder error:", event);
        let message = "Erreur pendant l'enregistrement.";
        // Tenter d'accéder à l'erreur spécifique si disponible
        const mediaRecorderError = (event as any).error as
          | DOMException
          | undefined;
        if (mediaRecorderError?.name) {
          message += ` (${mediaRecorderError.name})`;
        } else if (mediaRecorderError?.message) {
          message += ` (${mediaRecorderError.message})`;
        }
        setError(message);
        setStatus("error");
        // Essayer d'arrêter proprement le stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setStatus("recording");
    } catch (err: any) {
      // Typage 'any' pour l'erreur
      console.error("Erreur d'accès au micro ou de démarrage:", err);
      let errMsg = "Impossible de démarrer l'enregistrement.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errMsg =
          "L'accès au micro est nécessaire. Veuillez l'autoriser dans les paramètres.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errMsg = "Aucun microphone trouvé.";
      } else if (err.message) {
        errMsg = err.message; // Afficher le message d'erreur natif si disponible
      }
      setError(errMsg);
      setStatus("error");
      // S'assurer que le stream est nettoyé si l'erreur survient après getUserMedia mais avant recorder.start()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = useCallback(() => {
    // Utilisation de useCallback pour la stabilité
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      console.log("Stopping recording..."); // Log
      mediaRecorderRef.current.stop(); // L'événement onstop gèrera le changement de status
    } else if (mediaRecorderRef.current) {
      console.warn(
        "Attempted to stop recorder, but state was:",
        mediaRecorderRef.current.state
      );
    }
  }, []); // Dépendances vides

  const resetRecording = useCallback(() => {
    // Utilisation de useCallback
    // Abort ongoing recording safely
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = null; // Détacher l'ancien onstop pour éviter la création de blob
      mediaRecorderRef.current.onerror = null; // Détacher onerror
      // Vérifier si stop a déjà été appelé avant de le rappeler
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      console.log("Recorder stopped due to reset.");
    }
    // Stop stream tracks if they are still active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.log("Stream tracks stopped due to reset.");
    }

    setAudioBlob(null);
    setCountdown(duration);
    setStatus("idle"); // Revient à idle
    setError(null);
    recordingOptions.current = null; // Réinitialiser les options
    mediaRecorderRef.current = null; // Réinitialiser la ref du recorder
  }, [duration]); // Dépend de duration

  // NOUVEAU: useEffect pour gérer le reset après le fondu
  useEffect(() => {
    if (status === "success-fading") {
      const fadeDuration = 300; // Doit correspondre à la durée de la transition CSS
      const timer = setTimeout(() => {
        resetRecording();
      }, fadeDuration);
      return () => clearTimeout(timer);
    }
  }, [status, resetRecording]);

  const sendAudio = async (bucket: string, fileName?: string) => {
    if (!audioBlob) {
      setError("Aucun enregistrement à envoyer.");
      setStatus("error"); // Passer en status erreur si pas de blob
      return;
    }
    // --- MODIFICATION: Utiliser l'extension choisie ---
    if (!recordingOptions.current) {
      setError("Erreur interne: options d'enregistrement non trouvées.");
      setStatus("error");
      return;
    }
    const { ext } = recordingOptions.current;
    const finalFileName = fileName || `demo-recording-${Date.now()}.${ext}`;
    console.log(
      `Uploading file: ${finalFileName} with type: ${audioBlob.type}, size: ${audioBlob.size}`
    ); // Log
    // --- Fin MODIFICATION ---

    setStatus("uploading");
    setError(null);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(finalFileName, audioBlob, {
        contentType: audioBlob.type, // Spécifier explicitement le Content-Type
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError); // Log détaillé
      setError(`Erreur d'upload: ${uploadError.message}`);
      setStatus("error");
    } else {
      console.log("Upload successful!"); // Log
      setStatus("success");
      // MODIFIÉ: Passer à l'état de fondu après un délai
      const displaySuccessDuration = 2700; // Temps d'affichage du message avant fondu (3000ms total - 300ms de fondu)
      setTimeout(() => {
        // On vérifie si on est TOUJOURS en succès avant de déclencher le fondu
        // (l'utilisateur pourrait avoir cliqué "reset" entre temps)
        setStatus((currentStatus) =>
          currentStatus === "success" ? "success-fading" : currentStatus
        );
      }, displaySuccessDuration);
    }
  };

  // Cleanup effect pour arrêter stream/recorder si le composant est démonté pendant l'enregistrement
  useEffect(() => {
    return () => {
      console.log("Cleanup effect: stopping recorder and stream if active.");
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recorder during cleanup:", e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Réinitialiser les refs au cas où
      mediaRecorderRef.current = null;
      streamRef.current = null;
    };
  }, []); // Exécuté seulement au démontage

  return {
    status,
    audioBlob,
    countdown,
    error,
    startRecording,
    stopRecording,
    resetRecording, // On garde resetRecording exporté au cas où
    sendAudio,
    setError,
  };
}
