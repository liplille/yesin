// src/components/ExitIntentModal.tsx
import {
  XMarkIcon,
  MicrophoneIcon,
  RadioIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Ajoutez useNavigate
import { useEffect, useRef } from "react";
// Pas besoin de 'emit' ici pour les CTA, on appelle gtag/fbq directement pour le callback

type Props = {
  open: boolean;
  onClose: (reason?: string) => void; // onClose peut prendre une raison (pour tracer la fermeture passive)
  onCloseWithoutEvent: () => void; // Pour fermer après un CTA sans retracer 'closed'
};

// Timeout (en ms) pour le fallback si gtag/fbq est bloqué ou ne renvoie pas le callback
const NAVIGATION_TIMEOUT = 400;

export default function ExitIntentModal({
  open,
  onClose,
  onCloseWithoutEvent,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation(); // Hook pour obtenir le chemin actuel
  const navigate = useNavigate(); // Hook pour la navigation programmatique
  // Réf pour stocker l'ID du timer de fallback
  const navigationFallbackTimer = useRef<number | null>(null);

  // Gérer le focus -> sur le bouton Fermer à l'ouverture
  useEffect(() => {
    if (open) {
      // Léger délai pour s'assurer que le bouton est rendu et focusable
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [open]);

  // Gérer la touche Echap pour fermer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose("escape_key"); // Appelle onClose avec la raison 'escape_key'
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    // Nettoyage de l'event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]); // Dépend de open et onClose

  // Nettoyer le timer de fallback si le composant est démonté
  useEffect(() => {
    return () => {
      if (navigationFallbackTimer.current) {
        clearTimeout(navigationFallbackTimer.current);
      }
    };
  }, []);

  // Ne rend rien si la modale n'est pas ouverte
  if (!open) return null;

  // Handler pour le clic sur le backdrop (fond semi-transparent)
  const handleBackdropClick = () => {
    onClose("backdrop_click"); // Appelle onClose avec la raison 'backdrop_click'
  };

  // Handler pour le clic sur le bouton X (fermer)
  const handleCloseButtonClick = () => {
    onClose("close_button"); // Appelle onClose avec la raison 'close_button'
  };

  // Handler pour le CTA principal (Enregistrer) avec event_callback
  const handleCTARecordClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Empêche la navigation immédiate du Link
    if (navigationFallbackTimer.current)
      clearTimeout(navigationFallbackTimer.current); // Clear timer précédent

    const targetUrl = "/welcome"; // URL de destination
    const eventName = "exit_intent_cta_click";
    const eventParams = {
      cta_label: "enregistrer_pub",
      page: location.pathname,
    };

    // Fonction à exécuter après l'envoi (réel ou fallback) de l'événement
    const navigateToTarget = () => {
      if (navigationFallbackTimer.current)
        clearTimeout(navigationFallbackTimer.current); // Clear timer si callback arrive
      onCloseWithoutEvent(); // Ferme la modale SANS retracer l'event 'closed'
      navigate(targetUrl); // Navigation programmatique vers la cible
    };

    try {
      let gaCallbackFired = false; // Flag pour gérer le fallback
      // Tenter d'envoyer GA4 avec callback
      if (window.gtag) {
        window.gtag("event", eventName, {
          ...eventParams,
          // Le callback qui déclenche la navigation
          event_callback: () => {
            gaCallbackFired = true;
            navigateToTarget();
          },
          // Utilise 'beacon' pour augmenter les chances d'envoi avant déchargement de la page
          transport_type: "beacon",
        });
      } else {
        // Si gtag n'existe pas, on déclenche la navigation après un court délai pour laisser le temps à fbq
        console.warn(
          "[Analytics] window.gtag non trouvé pour CTA Record Click."
        );
        setTimeout(navigateToTarget, 10);
      }

      // Envoyer Meta Pixel (pas de callback fiable, on envoie et on continue)
      if (window.fbq) {
        window.fbq("trackCustom", eventName, eventParams);
      } else {
        console.warn(
          "[Analytics] window.fbq non trouvé pour CTA Record Click."
        );
      }

      // Fallback: Si le callback GA4 ne s'exécute pas (bloqueur, erreur), navigue après timeout
      // Ne démarre le timer que si gtag existait (sinon on a déjà appelé setTimeout)
      if (window.gtag) {
        navigationFallbackTimer.current = window.setTimeout(() => {
          if (!gaCallbackFired) {
            // Ne navigue que si le callback n'a pas déjà fait le travail
            console.warn(
              "[Analytics] GA4 event_callback timeout. Navigation forcée."
            );
            navigateToTarget();
          }
        }, NAVIGATION_TIMEOUT);
      }
    } catch (error) {
      console.error(
        "[Analytics] Erreur lors de l'envoi de l'event CTA Record:",
        error
      );
      // En cas d'erreur JS pendant l'envoi, on navigue quand même immédiatement
      navigateToTarget();
    }
  };

  // Handler pour le CTA WhatsApp avec event_callback
  const handleCTAWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Empêche l'ouverture immédiate du lien
    if (navigationFallbackTimer.current)
      clearTimeout(navigationFallbackTimer.current); // Clear timer précédent

    const targetUrl = e.currentTarget.href; // Récupère l'URL WhatsApp du lien cliqué
    const eventName = "exit_intent_cta_click";
    const eventParams = {
      cta_label: "whatsapp_question",
      page: location.pathname,
    };

    // Fonction à exécuter après l'envoi (réel ou fallback) de l'événement
    const openWhatsApp = () => {
      if (navigationFallbackTimer.current)
        clearTimeout(navigationFallbackTimer.current); // Clear timer si callback arrive
      onCloseWithoutEvent(); // Ferme la modale SANS retracer l'event 'closed'
      window.open(targetUrl, "_blank", "noopener,noreferrer"); // Ouvre WhatsApp dans un nouvel onglet
    };

    try {
      let gaCallbackFired = false;
      // GA4 avec callback
      if (window.gtag) {
        window.gtag("event", eventName, {
          ...eventParams,
          event_callback: () => {
            gaCallbackFired = true;
            openWhatsApp();
          },
          transport_type: "beacon",
        });
      } else {
        console.warn(
          "[Analytics] window.gtag non trouvé pour CTA WhatsApp Click."
        );
        setTimeout(openWhatsApp, 10);
      }

      // Meta Pixel
      if (window.fbq) {
        window.fbq("trackCustom", eventName, eventParams);
      } else {
        console.warn(
          "[Analytics] window.fbq non trouvé pour CTA WhatsApp Click."
        );
      }

      // Fallback
      if (window.gtag) {
        navigationFallbackTimer.current = window.setTimeout(() => {
          if (!gaCallbackFired) {
            console.warn(
              "[Analytics] GA4 event_callback timeout. Ouverture WhatsApp forcée."
            );
            openWhatsApp();
          }
        }, NAVIGATION_TIMEOUT);
      }
    } catch (error) {
      console.error(
        "[Analytics] Erreur lors de l'envoi de l'event CTA WhatsApp:",
        error
      );
      // En cas d'erreur JS, on ouvre quand même WhatsApp
      openWhatsApp();
    }
  };

  // Handler pour le bouton tertiaire "Non merci"
  const handleDismissAltClick = () => {
    // Appelle onClose standard, qui tracera l'événement 'closed'
    onClose("dismiss_alt_button");
  };

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
        onClick={handleBackdropClick} // Modifié
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg rounded-2xl border border-black/10 bg-bg p-6 shadow-2xl dark:border-white/10 transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-enter"
      >
        {/* Bouton Fermer (X) */}
        <button
          ref={closeButtonRef}
          className="absolute right-3 top-3 rounded-full p-1.5 text-fg/60 hover:text-fg/90 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={handleCloseButtonClick} // Modifié
          aria-label="Fermer"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Contenu de la modale */}
        <div className="space-y-4 text-center">
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

          {/* Boutons d'action */}
          <div className="flex flex-col gap-3 pt-4">
            {/* Bouton Primaire : Enregistrer (Link géré par handleCTARecordClick) */}
            <Link
              to="/welcome"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white font-semibold shadow-md transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={handleCTARecordClick} // Modifié
            >
              <MicrophoneIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
              Oui, j'enregistre ma pub audio
            </Link>

            {/* Bouton Secondaire : WhatsApp (<a> géré par handleCTAWhatsAppClick) */}
            <a
              href="https://wa.me/3366668573?text=Salut%20YesIn%20Media%20!%20J'ai%20une%20question%20avant%20d'enregistrer."
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/50 bg-green-500/10 px-5 py-2.5 text-green-700 dark:text-green-400 dark:border-green-500/30 dark:bg-green-500/10 font-medium transition hover:bg-green-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={handleCTAWhatsAppClick} // Modifié
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
              Poser une question sur WhatsApp
            </a>

            {/* Bouton Tertiaire : Fermer (géré par handleDismissAltClick) */}
            <button
              onClick={handleDismissAltClick} // Modifié
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
      {/* Animation d'entrée */}
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
