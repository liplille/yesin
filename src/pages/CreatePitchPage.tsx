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
import { emit } from "../lib/analytics"; // Importez emit

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
  // Ref pour s'assurer que l'événement signUpComplete n'est tracé qu'une fois
  const signupTrackedRef = useRef(false);

  // --- Track Sign Up Complete ---
  useEffect(() => {
    // Vérifie si le flag 'cameFromMagic' est présent dans sessionStorage (posé par AuthCallback)
    const cameFromMagic = sessionStorage.getItem("cameFromMagic") === "1";
    // Alternative/Renfort: vérifier aussi le query param ?new=1
    const isNewQueryParam =
      new URLSearchParams(window.location.search).get("new") === "1";

    // Si l'utilisateur vient du flux d'inscription (flag ou query param) ET que l'event n'a pas encore été tracé
    if ((cameFromMagic || isNewQueryParam) && !signupTrackedRef.current) {
      // Tenter de récupérer l'utilisateur actuel pour déterminer la méthode d'authentification
      supabase.auth
        .getUser()
        .then(({ data: { user } }) => {
          // La méthode peut être 'google', 'email' (pour OTP), ou autre provider
          // Fallback sur 'magic_link' si non disponible (cas le plus courant après email OTP)
          const authMethod = user?.app_metadata?.provider || "magic_link";
          // Émettre l'événement de complétion d'inscription
          emit.signUpComplete(authMethod, { page: "/create-pitch" });
          signupTrackedRef.current = true; // Marquer comme tracé pour éviter les doublons

          // Nettoyer le flag sessionStorage après l'avoir utilisé
          if (cameFromMagic) {
            sessionStorage.removeItem("cameFromMagic");
          }
          // Optionnel: nettoyer aussi le query param de l'URL pour une URL propre
          if (isNewQueryParam) {
            const url = new URL(window.location.href);
            url.searchParams.delete("new");
            window.history.replaceState({}, "", url.toString());
          }
        })
        .catch((err) => {
          // En cas d'échec de récupération de l'utilisateur, tracer avec un fallback
          console.error("Erreur récupération user pour tracking signup:", err);
          emit.signUpComplete("magic_link", {
            page: "/create-pitch",
            error: "user_fetch_failed",
          });
          signupTrackedRef.current = true; // Marquer quand même comme tracé
          if (cameFromMagic) sessionStorage.removeItem("cameFromMagic"); // Nettoyer le flag
          if (isNewQueryParam) {
            /* ... nettoyer URL ... */
          }
        });
    } else if (cameFromMagic) {
      // Si le flag est là mais déjà tracé, ou si pas besoin de tracer, juste nettoyer le flag
      sessionStorage.removeItem("cameFromMagic");
      if (isNewQueryParam) {
        /* ... nettoyer URL ... */
      }
    } else if (isNewQueryParam && !signupTrackedRef.current) {
      // Cas où seul ?new=1 est présent (ex: refresh après callback mais avant nettoyage)
      // On trace quand même si pas déjà fait
      emit.signUpComplete("unknown", {
        page: "/create-pitch",
        signal: "query_param_only",
      });
      signupTrackedRef.current = true;
      /* ... nettoyer URL ... */
    } else if (isNewQueryParam) {
      /* ... nettoyer URL ... */
    }

    // Vérification de session pour rediriger si non connecté (gardée de votre code)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/welcome");
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // Exécuté une seule fois au montage
  // --- Fin Track ---

  // Effet pour gérer le compte à rebours pendant l'enregistrement
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleStopRecording(); // Arrête l'enregistrement à la fin du temps
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    // Nettoyage de l'intervalle si l'enregistrement s'arrête ou le composant est démonté
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]); // Dépend de l'état d'enregistrement

  // Fonction pour démarrer l'enregistrement audio
  const handleStartRecording = async () => {
    // --- Track Recording Start (une seule fois par session d'onglet) ---
    // La clé de session sera 'recording_start:/create-pitch' ou similaire
    emit.recordingStartOnce({ page: "/create-pitch", recorder_type: "main" });
    // --- Fin Track ---

    // Réinitialisation des états
    setError(null);
    setAudioBlob(null);
    setCountdown(59);

    try {
      // Demande d'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      // Choix du type MIME supporté (webm>mp4>wav)
      let options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "audio/mp4" }; // Souvent m4a sur Safari iOS
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: "audio/wav" }; // Fallback
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              throw new Error("Aucun format d'enregistrement audio supporté.");
            }
          }
        }
      }
      console.log("Using MIME type:", options.mimeType); // Log utile

      // Création de l'instance MediaRecorder
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = []; // Tableau pour stocker les morceaux audio

      // Callback quand des données sont disponibles
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Callback quand l'enregistrement s'arrête
      recorder.onstop = () => {
        if (chunks.length > 0) {
          // Crée le Blob final avec le bon type MIME
          const recordedBlob = new Blob(chunks, { type: options.mimeType });
          setAudioBlob(recordedBlob);
          // TODO: Calculer la durée réelle ici si ce n'est pas fait dans useRecorder
        } else {
          setError("L'enregistrement n'a produit aucune donnée audio.");
        }
        // Arrête toutes les pistes du stream (micro)
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null); // Nettoie la référence au stream
      };

      // Callback en cas d'erreur pendant l'enregistrement
      recorder.onerror = (event) => {
        console.error("Erreur MediaRecorder:", event);
        // @ts-ignore Tentative d'accès à l'erreur détaillée
        const errorEvent = event as Event & { error?: DOMException };
        setError(
          `Erreur d'enregistrement: ${errorEvent.error?.name || "inconnue"}`
        );
        setIsRecording(false);
        if (stream) stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };

      // Stocke la référence et démarre l'enregistrement
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true); // Met à jour l'état de l'UI
    } catch (err: any) {
      // Gestion des erreurs de getUserMedia (accès micro refusé, etc.)
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
      // Nettoyage stream si l'erreur survient après getUserMedia
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
  };

  // Fonction pour arrêter l'enregistrement
  const handleStopRecording = () => {
    // Vérifie si l'enregistreur existe et est en cours d'enregistrement
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop(); // Déclenche recorder.onstop
    } else {
      // Si l'enregistreur n'est pas actif mais qu'un stream existe, l'arrêter
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    // Met à jour l'état de l'UI, même si stop() a été appelé par le countdown
    setIsRecording(false);
  };

  // Fonction pour envoyer le pitch enregistré à Supabase
  const handleSendPitch = async () => {
    if (!audioBlob) {
      setError("Aucun pitch enregistré à envoyer.");
      return;
    }
    // Récupère l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Veuillez vous reconnecter pour envoyer votre pitch.");
      navigate("/welcome"); // Rediriger si session expirée
      return;
    }

    setIsSending(true); // Met l'UI en état d'envoi
    setError(null);

    // Détermine l'extension du fichier à partir du type MIME
    const mimeType = audioBlob.type;
    let extension = "bin"; // Fallback
    if (mimeType.includes("webm")) extension = "webm";
    else if (mimeType.includes("mp4") || mimeType.includes("aac"))
      extension = "m4a"; // mp4 container for aac
    else if (mimeType.includes("wav")) extension = "wav";
    else if (mimeType.includes("ogg")) extension = "ogg";

    // Construit le nom de fichier unique
    const fileName = `pitch-${user.id}-${Date.now()}.${extension}`;

    try {
      // Upload le fichier audio vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("pitches") // Nom du bucket
        .upload(fileName, audioBlob, { contentType: mimeType }); // Passe le blob et le type MIME
      if (uploadError) throw uploadError; // Lève une erreur si l'upload échoue

      // Insère les métadonnées dans la table Supabase
      const { error: insertError } = await supabase
        .from("pitches_metadata") // Nom de la table
        .insert({
          pitch_file_name: fileName,
          user_id: user.id,
          latitude: geoCoords?.lat ?? null, // Coordonnées géographiques (optionnel)
          longitude: geoCoords?.lon ?? null,
        });
      if (insertError) throw insertError; // Lève une erreur si l'insertion échoue

      // --- Track Pitch Submit Success ---
      // Utilise l'estimation de durée basée sur le countdown restant
      const approxDuration = 59 - countdown;
      emit.pitchSubmitSuccess({
        page: "/create-pitch", // Page actuelle
        recorder_type: "main", // Indique que c'est l'enregistreur principal
        duration_sec: approxDuration, // Durée estimée
        file_ext: extension, // Extension du fichier
        file_size_bytes: audioBlob?.size ?? 0, // Taille du fichier
      });
      // --- Fin Track ---

      // Marque que l'audio a été soumis (pour RouteGate) et navigue vers la page de remerciement
      sessionStorage.setItem("audioSubmitted", "true");
      navigate("/thank-you/submitted", {
        replace: true, // Remplace l'entrée actuelle dans l'historique
        state: { audioSubmitted: true }, // Passe un état pour confirmation immédiate
      });
    } catch (err: any) {
      // Gestion des erreurs d'upload ou d'insertion
      console.error("Erreur lors de l'envoi:", err);
      setError(
        `Erreur d'envoi: ${err?.message || "Une erreur inconnue est survenue."}`
      );
    } finally {
      setIsSending(false); // Réinitialise l'état d'envoi de l'UI
    }
  };

  // Fonction pour réinitialiser l'état de l'enregistreur
  const handleReset = () => {
    // Arrête proprement l'enregistreur s'il est actif
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null; // Détache l'ancien callback onstop
        mediaRecorderRef.current.onerror = null; // Détache l'ancien callback onerror
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }
    }
    // Arrête le stream micro s'il est actif
    if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());

    // Réinitialise tous les états à leurs valeurs par défaut
    setAudioBlob(null);
    setCountdown(59);
    setIsRecording(false);
    setMediaStream(null);
    mediaRecorderRef.current = null;
    setIsSending(false);
    setError(null);
    // setRecordedDuration(null); // Si vous ajoutez cet état
  };

  // Affiche un texte indiquant le statut de la géolocalisation
  const geoStatusDisplay = useMemo(() => {
    if (geoCoords) {
      return `Position prête`;
    }
    return "Localisation non active";
  }, [geoCoords]);

  // Détermine si le bouton d'envoi doit être désactivé
  const isSendButtonDisabled = isSending; // Pourrait inclure d'autres conditions futures

  // Rendu JSX du composant
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
        {/* --- État Initial (avant enregistrement) --- */}
        {!isRecording && !audioBlob && (
          <div className="flex flex-col items-center gap-6 w-full text-center">
            {/* Icône micro stylisée */}
            <div className="p-4 rounded-full bg-primary/10 mb-2 shadow-inner">
              <MicrophoneIcon className="h-16 w-16 text-primary drop-shadow-lg" />
            </div>
            {/* Bouton pour démarrer l'enregistrement */}
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

        {/* --- État Enregistrement en cours --- */}
        {isRecording && (
          <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
            {/* Visualiseur d'onde sonore */}
            <SoundWaveBars isActive={isRecording} />
            {/* Bouton pour arrêter l'enregistrement */}
            <button
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 font-bold text-white text-base sm:px-6 sm:py-3 sm:text-lg hover:opacity-90 transition-transform hover:scale-105"
            >
              <StopCircleIcon className="h-6 w-6" />
              Arrêter
            </button>
            {/* Compte à rebours */}
            <div className="text-2xl font-bold tabular-nums animate-pulse text-red-500">
              0:{countdown.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* --- État Pitch Prêt (après enregistrement) --- */}
        {audioBlob && !isRecording && (
          <div className="flex w-full flex-col items-center gap-4 py-4 sm:py-6">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-7 w-7 text-green-500" />
              <span>Votre pitch est prêt !</span>
            </h3>
            {/* Lecteur audio pour écouter l'enregistrement */}
            <audio
              src={URL.createObjectURL(audioBlob)} // Crée une URL temporaire pour le blob
              controls
              className="w-full max-w-md mx-auto rounded-lg"
            />
            {/* Statut Géolocalisation */}
            <div className="text-sm opacity-80 flex items-center justify-center gap-1.5 mt-3">
              <MapPinIcon
                className={`h-4 w-4 ${
                  geoCoords ? "text-green-500" : "text-gray-400"
                }`}
              />
              <span>{geoStatusDisplay}</span>
              {/* Bouton pour activer la géoloc si absente et fonction disponible */}
              {!geoCoords && geoLocate && (
                <button
                  onClick={geoLocate}
                  className="ml-1 underline text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  disabled={isSending} // Désactivé pendant l'envoi
                >
                  (Activer ?)
                </button>
              )}
            </div>
            {/* Séparateur visuel */}
            <hr className="w-1/2 border-white/10 my-4 sm:my-6" />
            {/* Section des boutons d'action */}
            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              {/* Bouton pour envoyer le pitch */}
              <button
                onClick={handleSendPitch}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-purple-600 px-6 py-3 font-bold text-white text-base shadow-lg hover:opacity-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transition-transform transform hover:scale-[1.03] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSendButtonDisabled} // Désactivé pendant l'envoi
              >
                {isSending ? ( // Affiche un spinner si envoi en cours
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
                {isSending ? "Envoi..." : "Envoyer mon pitch"}
              </button>
              {/* Bouton pour recommencer */}
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 mt-1"
                disabled={isSending} // Désactivé pendant l'envoi
              >
                <ArrowPathIcon className="h-4 w-4" />
                Recommencer
              </button>
            </div>
            {/* Conseil si géoloc absente */}
            {!geoCoords && !isSending && (
              <p className="text-xs opacity-50 mt-4">
                (Conseil : Ajoutez la localisation pour maximiser votre
                visibilité locale.)
              </p>
            )}
          </div>
        )}
      </div>{" "}
      {/* Fin du conteneur principal du bloc */}
      {/* Section Conseils */}
      <div className="mt-12 text-left">
        <h4 className="text-center font-bold mb-4">
          Nos conseils pour un pitch réussi ✨
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Conseil 1 */}
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">🤫</span>
            <p className="font-semibold mt-1">Trouvez un endroit calme</p>
            <p className="opacity-70">
              Évitez les bruits de fond pour que votre voix soit claire et
              nette.
            </p>
          </div>
          {/* Conseil 2 */}
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">😊</span>
            <p className="font-semibold mt-1">Parlez avec le sourire</p>
            <p className="opacity-70">
              Votre énergie s'entend ! Soyez passionné, votre audience le
              ressentira.
            </p>
          </div>
          {/* Conseil 3 */}
          <div className="rounded-lg bg-white/5 p-4 border border-black/5 dark:border-white/5">
            <span className="text-xl">🌟</span>
            <p className="font-semibold mt-1">Soyez vous-même</p>
            <p className="opacity-70">
              C'est votre histoire. L'authenticité est ce qui crée la connexion.
            </p>
          </div>
        </div>
      </div>
      {/* Composant Toast pour afficher les erreurs */}
      <Toast message={error} onClose={() => setError(null)} />
      {/* Styles CSS pour l'animation du bouton principal */}
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
