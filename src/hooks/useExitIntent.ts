// src/hooks/useExitIntent.ts
import { useEffect, useRef, useState } from "react";
// Assurez-vous que le chemin d'importation est correct
import { emit } from "../lib/analytics";
import { useLocation } from "react-router-dom"; // Importez useLocation pour obtenir le chemin actuel

type Options = {
  sessionKey?: string; // Clé sessionStorage pour marquer comme "vu/fermé"
  delay?: number; // Délai en ms avant affichage après détection de sortie
  topBoundary?: number; // Nombre de pixels depuis le haut pour déclencher (mouseout)
  mobileVisibility?: boolean; // Activer le déclenchement sur changement de visibilité (mobile)
  enabled?: boolean; // Activer/désactiver complètement le hook
};

/**
 * Hook pour détecter l'intention de sortie de l'utilisateur (souris quittant la fenêtre vers le haut)
 * ou le changement de visibilité sur mobile, et afficher une modale.
 * Gère également le suivi analytique de l'affichage, de la fermeture et des clics CTA.
 */
export function useExitIntent({
  sessionKey = "exit-intent:getstarted:dismissed", // Clé par défaut
  delay = 80, // Délai court par défaut
  topBoundary = 8, // Sensible par défaut
  mobileVisibility = true, // Activé par défaut
  enabled = true, // Activé par défaut
}: Options = {}) {
  const [open, setOpen] = useState(false); // État d'ouverture de la modale
  const timer = useRef<number | null>(null); // Réf pour le timer du délai
  const optOutNextNavRef = useRef(false); // Réf pour ignorer la détection si un clic sur lien/bouton vient d'avoir lieu
  const location = useLocation(); // Hook pour obtenir le chemin actuel de la page
  // Réf pour s'assurer que l'événement 'shown' n'est tracé qu'une fois par ouverture de modale
  const shownTrackedRef = useRef(false);

  // Ferme la modale si le hook est désactivé dynamiquement
  useEffect(() => {
    if (!enabled && open) {
      setOpen(false);
      shownTrackedRef.current = false; // Réinitialiser le flag de suivi
    }
  }, [enabled, open]);

  // Effet principal pour attacher/détacher les listeners
  useEffect(() => {
    // Si le hook est désactivé, ne rien faire
    if (!enabled) return;

    // Si l'utilisateur a déjà fermé la modale pendant cette session d'onglet, ne rien faire
    if (sessionStorage.getItem(sessionKey) === "1") return;

    // Handler pour détecter la sortie de la souris vers le haut (desktop)
    const onMouseOut = (e: MouseEvent) => {
      // Ignore si la souris va vers un autre élément dans la page
      if ((e as any).relatedTarget || (e as any).toElement) return;
      // Déclenche seulement si la souris est près du bord supérieur
      if (e.clientY <= topBoundary) {
        // Annule un timer précédent s'il existe
        if (timer.current) window.clearTimeout(timer.current);
        // Démarre un nouveau timer pour ouvrir la modale après le délai
        timer.current = window.setTimeout(() => {
          // Vérifie qu'un clic récent n'a pas eu lieu et que la modale n'est pas déjà ouverte
          if (!optOutNextNavRef.current && !open) {
            setOpen(true); // Ouvre la modale
            // --- Track Exit Intent Shown ---
            // Trace l'événement seulement si ce n'est pas déjà fait pour cette ouverture
            if (!shownTrackedRef.current) {
              emit.exitIntentShown({
                page: location.pathname,
                trigger: "mouseout_top",
              });
              shownTrackedRef.current = true; // Marque comme tracé
            }
            // --- Fin Track ---
          }
        }, delay) as unknown as number; // `as unknown as number` pour compatibilité Node/Browser types
      }
    };

    // Handler pour détecter les clics sur des liens/boutons et ignorer temporairement la détection de sortie
    const onAnyClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      // Vérifie si la cible ou un de ses parents est un élément cliquable interactif
      const el = target.closest("a, button, [role='button']");
      if (!el) return;
      // Si oui, active le flag pour ignorer la prochaine détection de sortie
      optOutNextNavRef.current = true;
      // Désactive le flag après un court délai
      setTimeout(() => (optOutNextNavRef.current = false), 200);
    };

    // Handler pour détecter le changement de visibilité (mobile: passage en arrière-plan)
    const onVisibility = () => {
      // Ne s'applique que si l'option mobileVisibility est activée
      if (!mobileVisibility) return;
      // Déclenche si la page devient cachée et que la modale n'est pas déjà ouverte
      if (document.visibilityState === "hidden" && !open) {
        // Vérifie si l'utilisateur n'a pas déjà fermé la modale dans cette session
        if (sessionStorage.getItem(sessionKey) === "1") return;
        setOpen(true); // Ouvre la modale
        // --- Track Exit Intent Shown (mobile) ---
        if (!shownTrackedRef.current) {
          emit.exitIntentShown({
            page: location.pathname,
            trigger: "visibility_hidden",
          });
          shownTrackedRef.current = true; // Marque comme tracé
        }
        // --- Fin Track ---
      }
    };

    // Attache les listeners
    window.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", onAnyClick, { capture: true }); // Capture pour intercepter avant la navigation
    if (mobileVisibility) {
      document.addEventListener("visibilitychange", onVisibility);
    }

    // Fonction de nettoyage : détache les listeners et annule le timer quand le composant est démonté ou les dépendances changent
    return () => {
      window.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("click", onAnyClick, { capture: true });
      if (mobileVisibility) {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (timer.current) {
        window.clearTimeout(timer.current); // Annule le timer s'il était en cours
      }
    };
    // Dépendances de l'effet : ré-attache les listeners si une de ces valeurs change
  }, [
    enabled,
    delay,
    topBoundary,
    sessionKey,
    mobileVisibility,
    location.pathname,
    open,
  ]);

  /**
   * Fonction pour fermer la modale ET tracer l'événement de fermeture.
   * Doit être appelée lors d'une fermeture "passive" (clic sur X, Echap, backdrop).
   * @param reason - Chaîne décrivant la raison de la fermeture (ex: 'dismiss', 'escape_key').
   */
  const dismiss = (reason: string = "dismiss") => {
    // Ne rien faire si la modale n'est pas ouverte
    if (!open) return;
    // Marque dans sessionStorage pour ne pas réafficher pendant cette session d'onglet
    sessionStorage.setItem(sessionKey, "1");
    setOpen(false); // Met à jour l'état pour fermer la modale
    // --- Track Exit Intent Closed ---
    emit.exitIntentClosed(reason, { page: location.pathname });
    // --- Fin Track ---
    shownTrackedRef.current = false; // Réinitialise le flag de suivi pour une potentielle future ouverture (si sessionStorage est vidé)
  };

  /**
   * Fonction pour fermer la modale SANS tracer l'événement de fermeture.
   * Doit être appelée après un clic sur un CTA, car l'action CTA est déjà tracée.
   */
  const closeWithoutEvent = () => {
    if (!open) return; // Ne rien faire si déjà fermé
    // Marque quand même dans sessionStorage pour éviter le réaffichage immédiat
    sessionStorage.setItem(sessionKey, "1");
    setOpen(false); // Met à jour l'état pour fermer
    shownTrackedRef.current = false; // Réinitialise le flag de suivi
  };

  // Le hook retourne l'état d'ouverture et les fonctions pour gérer la fermeture
  return { open, setOpen, dismiss, closeWithoutEvent };
}
