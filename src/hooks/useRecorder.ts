// src/hooks/useRecorder.ts
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export type RecordingStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "error"
  | "uploading"
  | "success";

export function useRecorder({ duration = 59 } = {}) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(duration);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (status === "recording") {
      interval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setCountdown(duration);
    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const completeBlob = new Blob(chunks, { type: "audio/m4a" });
        setAudioBlob(completeBlob);
        setStatus("recorded");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Erreur d'accès au micro:", err);
      setError(
        "L'accès au micro est nécessaire. Veuillez l'autoriser dans les paramètres de votre navigateur."
      );
      setStatus("error");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    // Le status passera à "recorded" via l'événement onstop
  };

  const resetRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioBlob(null);
    setCountdown(duration);
    setStatus("idle");
    setError(null);
  };

  const sendAudio = async (bucket: string, fileName?: string) => {
    if (!audioBlob) {
      setError("Aucun enregistrement à envoyer.");
      return;
    }
    setStatus("uploading");
    setError(null);

    const finalFileName = fileName || `demo-recording-${Date.now()}.m4a`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(finalFileName, audioBlob);

    if (uploadError) {
      setError(uploadError.message);
      setStatus("error");
    } else {
      setStatus("success");
      // Reset after a short delay to show success message
      setTimeout(() => {
        resetRecording();
      }, 3000);
    }
  };

  return {
    status,
    audioBlob,
    countdown,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    sendAudio,
    setError,
  };
}
