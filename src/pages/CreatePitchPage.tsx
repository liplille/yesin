import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Toast from "../components/Toast";

export default function CreatePitchPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(59);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(""); // Pour l'aria-live
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const navigate = useNavigate();

  // Vérifie la session utilisateur
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/m4a" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatusMessage("Enregistrement démarré.");
      setIsRecording(true);
    } catch (err) {
      setError("L'accès au micro est nécessaire. Veuillez l'autoriser.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setCountdown(59);
    setStatusMessage(
      "Enregistrement terminé. Vous pouvez écouter avant d'envoyer."
    );
  };

  const handleSendPitch = async () => {
    if (!audioBlob) return;
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

    if (uploadError) setError(uploadError.message);
    else navigate("/thank-you");
  };

  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      {/* Annonces pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </div>
      <h1 className="text-3xl font-bold mb-2">Enregistrez votre pitch 🎙️</h1>
      <p className="mb-6 opacity-80">Vous avez 59 secondes pour convaincre.</p>

      <div className="rounded-2xl border border-black/10 bg-white/5 p-5 shadow-lg dark:border-white/10">
        <div className="flex items-center gap-3">
          {!isRecording && !audioBlob && (
            <button
              onClick={handleStartRecording}
              className="btn rounded-full bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
            >
              🎤 Démarrer
            </button>
          )}
          {isRecording && (
            <button
              onClick={handleStopRecording}
              className="btn rounded-full bg-red-500 px-4 py-2 font-medium text-white hover:opacity-90"
            >
              ⏹️ Stop
            </button>
          )}
          <div className="ml-auto text-sm tabular-nums">
            00:{countdown.toString().padStart(2, "0")}
          </div>
        </div>

        {audioBlob && (
          <div className="mt-4">
            <audio src={URL.createObjectURL(audioBlob)} controls />
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => setAudioBlob(null)}
                className="text-sm underline"
              >
                Recommencer
              </button>
              <button
                onClick={handleSendPitch}
                className="btn rounded-full bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
              >
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
