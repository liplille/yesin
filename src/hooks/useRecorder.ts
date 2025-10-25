// src/hooks/useRecorder.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
// Assurez-vous que le chemin d'importation est correct
import { emit } from "../lib/analytics";

export type RecordingStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "error"
  | "uploading"
  | "success"
  | "success-fading"; // Nouvel état pour la transition

// Helper pour choisir le type MIME supporté
function pickSupportedMime(): { mime: string; ext: string } {
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "audio/mp4", ext: "m4a" }, // iOS Safari, standard
    { mime: "audio/aac", ext: "aac" },
    { mime: "audio/webm;codecs=opus", ext: "webm" }, // Chrome/Firefox Desktop/Android
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/wav", ext: "wav" }, // Fallback universel
  ];

  if (typeof window.MediaRecorder === "undefined") {
    console.warn("MediaRecorder n'est pas supporté par ce navigateur.");
    return { mime: "audio/wav", ext: "wav" };
  }

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      console.log(`Using supported MIME type: ${c.mime}`);
      return c;
    }
  }
  console.warn(
    "Aucun des types MIME préférés n'est supporté, fallback en WAV."
  );
  return { mime: "audio/wav", ext: "wav" };
}

export function useRecorder({ duration = 59 } = {}) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(duration);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingOptions = useRef<{ mime: string; ext: string } | null>(null);
  // État pour stocker la durée réelle
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null);

  // --- DÉFINITION DE stopRecording DÉPLACÉE ICI ---
  // Utilisation de useCallback pour que la référence de la fonction soit stable
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      console.log("Stopping recording...");
      try {
        mediaRecorderRef.current.stop(); // Déclenche onstop
      } catch (e) {
        console.warn("Error calling stop() on MediaRecorder:", e);
        // Tentative d'arrêt direct des pistes si stop échoue
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        // Force le changement de statut si stop a échoué mais qu'on veut quand même passer à l'état recorded
        // Attention: ceci pourrait se produire avant que ondataavailable ait fini si l'erreur est rapide
        // On vérifie le statut courant avant de forcer le changement
        setStatus((currentStatus) =>
          currentStatus === "recording" ? "recorded" : currentStatus
        );
      }
    } else if (mediaRecorderRef.current) {
      console.warn(
        "Attempted to stop recorder, but state was:",
        mediaRecorderRef.current.state
      );
    }
    // Ne pas nullifier mediaRecorderRef ici, onstop le fera
  }, []); // Dépendances vides car utilise des refs
  // --- FIN DU DÉPLACEMENT ---

  // Effet pour le compte à rebours
  useEffect(() => {
    let interval: number | undefined;
    if (status === "recording") {
      interval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // ✅ Utilisation de stopRecording maintenant définie
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // ✅ Correction: dépendance à stopRecording est maintenant valide
  }, [status, stopRecording]);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setCountdown(duration);
    setStatus("requesting");
    setRecordedDuration(null); // Réinitialiser la durée mesurée

    recordingOptions.current = pickSupportedMime();
    const { mime } = recordingOptions.current;
    console.log("Starting recording with options:", recordingOptions.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Stocker la référence au stream

      if (typeof window.MediaRecorder === "undefined") {
        throw new Error("MediaRecorder n'est pas supporté par ce navigateur.");
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder; // Stocker la référence à l'enregistreur

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        let createdBlob: Blob | null = null;
        if (chunks.length > 0) {
          createdBlob = new Blob(chunks, { type: mime });
          console.log(
            `Blob created with type: ${mime}, size: ${createdBlob.size}`
          );
          setAudioBlob(createdBlob); // Mettre à jour l'état après création
          setStatus("recorded");

          // Calculer la durée réelle
          try {
            const audioUrl = URL.createObjectURL(createdBlob);
            const audioElement = new Audio(audioUrl);
            audioElement.onloadedmetadata = () => {
              if (isFinite(audioElement.duration)) {
                setRecordedDuration(audioElement.duration);
                console.debug(
                  "[Recorder] Durée réelle calculée:",
                  audioElement.duration
                );
              } else {
                console.warn(
                  "[Recorder] Impossible de lire la durée audio (Infinity/NaN)."
                );
                setRecordedDuration(null); // Indique que le calcul a échoué
              }
              URL.revokeObjectURL(audioUrl); // Nettoyer l'URL objet après usage
            };
            // Gestion erreur chargement metadata
            audioElement.onerror = (e) => {
              console.error(
                "[Recorder] Erreur chargement audio pour durée:",
                e
              );
              setRecordedDuration(null);
              URL.revokeObjectURL(audioUrl); // Nettoyer même en cas d'erreur
            };
          } catch (err) {
            console.error("[Recorder] Erreur création Audio pour durée:", err);
            setRecordedDuration(null); // Indique que le calcul a échoué
          }
        } else {
          console.warn("Recording stopped but no data chunks received.");
          setError("Aucune donnée audio n'a été enregistrée.");
          setStatus("error");
        }

        // Nettoyer le stream après l'arrêt (déplacé ici pour être sûr qu'il soit nettoyé)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null; // Important de nullifier la ref après arrêt
        }
        mediaRecorderRef.current = null; // Nettoyer aussi la ref recorder ici après onstop
      };

      recorder.onerror = (event: Event) => {
        console.error("MediaRecorder error:", event);
        let message = "Erreur pendant l'enregistrement.";
        const mediaRecorderError = (event as any).error as
          | DOMException
          | undefined;
        if (mediaRecorderError?.name)
          message += ` (${mediaRecorderError.name})`;
        setError(message);
        setStatus("error");
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
      };

      recorder.start();
      setStatus("recording");
    } catch (err: any) {
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
        errMsg = err.message;
      }
      setError(errMsg);
      setStatus("error");
      // Nettoyer streamRef si getUserMedia a réussi mais MediaRecorder a échoué
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null; // Assurer la nullification
    }
  };

  // Réinitialiser l'enregistreur
  const resetRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      if (mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recorder on reset:", e);
        }
      }
      console.log("Recorder stopped due to reset.");
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.log("Stream tracks stopped due to reset.");
    }

    setAudioBlob(null);
    setCountdown(duration);
    setStatus("idle");
    setError(null);
    setRecordedDuration(null); // Réinitialiser la durée mesurée
    recordingOptions.current = null;
    mediaRecorderRef.current = null; // Assurer la réinitialisation de la ref recorder
  }, [duration]);

  // Effet pour passer de 'success' à 'success-fading' puis reset
  useEffect(() => {
    if (status === "success-fading") {
      const fadeDuration = 300; // Durée de la transition CSS
      const timer = setTimeout(() => {
        resetRecording(); // Appelle la fonction de reset après le fondu
      }, fadeDuration);
      return () => clearTimeout(timer); // Nettoie le timer si le status change avant la fin
    }
  }, [status, resetRecording]); // Dépend du status et de la fonction reset stable

  // Envoyer l'audio à Supabase
  const sendAudio = async (
    bucket: string,
    fileName?: string,
    // ✅ Accepte un contexte pour l'analytics
    analyticsContext: Record<string, any> = {}
  ): Promise<boolean> => {
    // Retourne une promesse indiquant le succès
    if (!audioBlob) {
      setError("Aucun enregistrement à envoyer.");
      setStatus("error");
      return false; // Échec
    }
    if (!recordingOptions.current) {
      setError("Erreur interne: options d'enregistrement non trouvées.");
      setStatus("error");
      return false; // Échec
    }

    const { ext } = recordingOptions.current;
    const finalFileName = fileName || `demo-recording-${Date.now()}.${ext}`;
    console.log(
      `Uploading file: ${finalFileName} with type: ${audioBlob.type}, size: ${audioBlob.size}`
    );

    setStatus("uploading");
    setError(null);
    let uploadSuccessful = false; // Flag de succès

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, audioBlob, {
          contentType: audioBlob.type,
          // upsert: false // Optionnel: éviter d'écraser si le nom existe déjà
        });

      if (uploadError) {
        throw uploadError; // Va au bloc catch
      }

      // Upload réussi
      console.log("Upload successful!");
      uploadSuccessful = true;
      setStatus("success");

      // --- Track Pitch Submit Success avec durée réelle ---
      // Utilise la durée réelle si disponible, sinon fallback sur l'estimation
      const finalDuration =
        recordedDuration !== null && isFinite(recordedDuration)
          ? Math.round(recordedDuration)
          : Math.max(0, duration - countdown); // Estimation fallback
      const fileExt = recordingOptions.current?.ext ?? "bin";

      emit.pitchSubmitSuccess({
        ...analyticsContext, // Inclut page, recorder_type, etc.
        duration_sec: finalDuration,
        file_ext: fileExt,
        file_size_bytes: audioBlob?.size ?? 0,
      });
      // --- Fin Track ---

      // Déclenche le fondu après un délai
      const displaySuccessDuration = 2700;
      setTimeout(() => {
        setStatus((currentStatus) =>
          currentStatus === "success" ? "success-fading" : currentStatus
        );
      }, displaySuccessDuration);
    } catch (uploadError: any) {
      console.error("Supabase upload error:", uploadError);
      setError(`Erreur d'upload: ${uploadError.message}`);
      setStatus("error"); // Assure le statut d'erreur
      uploadSuccessful = false;
    }

    return uploadSuccessful; // Retourne le statut de l'upload
  };

  // Effet de nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      console.log(
        "Cleanup effect: stopping recorder and stream if active on unmount."
      );
      // Stoppe l'enregistrement ou le stream si le composant est retiré pendant l'opération
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
      mediaRecorderRef.current = null;
      streamRef.current = null;
    };
  }, []); // Exécuté seulement au démontage

  // Valeurs retournées par le hook
  return {
    status,
    audioBlob,
    countdown,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    sendAudio, // Fonction pour envoyer l'audio, accepte contexte analytics
    setError, // Pour pouvoir définir une erreur depuis l'extérieur si besoin
    recordedDuration, // Retourne la durée calculée (peut être null)
  };
}
