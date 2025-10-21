// src/components/ExitIntentModal.tsx
import {
  XMarkIcon,
  MicrophoneIcon,
  RadioIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline"; // Ajout ChatBubbleLeftRightIcon
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
// Retire l'import de TextLogo si non utilisé ici, ou garde-le si tu veux le remettre quelque part.

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ExitIntentModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Gérer le focus -> sur le bouton Fermer
  useEffect(() => {
    if (open) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [open]);

  // Gérer la touche Echap pour fermer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out"
      style={{ opacity: open ? 1 : 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-title"
      aria-describedby="exit-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg rounded-2xl border border-black/10 bg-bg p-6 shadow-2xl dark:border-white/10 transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-enter"
      >
        <button
          ref={closeButtonRef}
          className="absolute right-3 top-3 rounded-full p-1.5 text-fg/60 hover:text-fg/90 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={onClose}
          aria-label="Fermer"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="space-y-4 text-center">
          {/* Icône Radio */}
          <div className="flex justify-center text-primary mb-1">
            <RadioIcon className="h-10 w-10" />
          </div>

          <h3 id="exit-title" className="text-xl sm:text-2xl font-bold text-fg">
            Ne partez pas si vite ! 👋
          </h3>
          <p
            id="exit-description"
            className="text-fg/85 leading-relaxed px-2 sm:px-4"
          >
            Êtes-vous sûr(e) de vouloir manquer l'opportunité d'enregistrer
            votre <strong className="text-primary">pub audio gratuite</strong> ?
            Elle sera diffusée sur notre{" "}
            <strong className="text-primary">radio locale</strong> pour toucher
            un maximum de monde.
          </p>

          {/* Boutons */}
          <div className="flex flex-col gap-3 pt-4">
            {/* Bouton Primaire : Enregistrer */}
            <Link
              to="/welcome"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white font-semibold shadow-md transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={onClose}
            >
              {/* Icône Microphone retirée du texte, mais conservée ici pour l'action */}
              <MicrophoneIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
              Oui, j'enregistre ma pub audio
            </Link>

            {/* Bouton Secondaire : WhatsApp */}
            <a
              href="https://wa.me/3366668573?text=Salut%20YesIn%20Media%20!%20J'ai%20une%20question%20avant%20d'enregistrer." // Message pré-rempli ajusté
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/50 bg-green-500/10 px-5 py-2.5 text-green-700 dark:text-green-400 dark:border-green-500/30 dark:bg-green-500/10 font-medium transition hover:bg-green-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={onClose} // On ferme aussi le modal quand on clique sur WhatsApp
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
              Poser une question sur WhatsApp
            </a>

            {/* Bouton Tertiaire : Fermer */}
            <button
              onClick={onClose}
              className="w-full rounded-xl px-5 py-2 text-sm text-fg/60 font-medium transition hover:text-fg/90 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
            >
              Non merci, une autre fois
            </button>
          </div>
          <p className="text-xs opacity-60 pt-2 text-center">
            C'est simple, rapide et 100% gratuit.
          </p>
        </div>
      </div>
      {/* Animation */}
      <style>{`
        @keyframes modal-enter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
