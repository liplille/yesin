// src/components/AnalyticsRouterListener.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
// Assurez-vous que le chemin d'importation est correct
import { shouldTrackPath, trackPageView } from "../lib/analytics";

type AnalyticsRouterListenerProps = {
  isAuthenticated: boolean;
};

// Ce composant écoute les changements de location (URL) et envoie les événements
// page_view à GA4 et Meta Pixel si les conditions sont remplies.
export default function AnalyticsRouterListener({
  isAuthenticated,
}: AnalyticsRouterListenerProps) {
  const location = useLocation();
  // useRef pour stocker le dernier chemin tracé et éviter les doublons dus aux re-renders rapides
  // ou aux changements non pertinents (ex: hash change non suivi).
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Construit le chemin complet actuel incluant query params et hash
    const currentPath = location.pathname + location.search + location.hash;

    // Étape 1: Vérifier si le chemin a réellement changé depuis le dernier traçage
    // Si c'est le même chemin, on ne fait rien pour éviter les doublons.
    if (currentPath === lastTrackedPathRef.current) {
      // console.debug('[Analytics] Path identique au précédent, skip page_view:', currentPath);
      return;
    }

    // Étape 2: Vérifier si ce chemin DOIT être tracé
    // Utilise la fonction de filtrage qui exclut les callbacks et certaines pages si l'utilisateur est connecté.
    if (shouldTrackPath(location.pathname, isAuthenticated)) {
      // Étape 3: Mettre à jour la référence UNIQUEMENT si on va tracer
      // Cela évite de bloquer un traçage futur si on revient sur la même URL
      // mais que l'état d'authentification a changé entre-temps.
      lastTrackedPathRef.current = currentPath;

      // Étape 4: Envoyer l'événement page_view
      // On passe le chemin relatif (pathname + search) pour le paramètre 'page_path' de GA4
      // et le titre actuel du document pour le paramètre 'page_title'.
      trackPageView(location.pathname + location.search, document.title);
    } else {
      // Optionnel: Log pour savoir pourquoi un chemin a été ignoré (visible si DEBUG_ANALYTICS est activé)
      // On NE met PAS à jour lastTrackedPathRef ici.
      // console.debug(`[Analytics] Path ${location.pathname} non tracé (filtré).`);
    }
  }, [location, isAuthenticated]); // Le hook se redéclenche à chaque changement de 'location' ou 'isAuthenticated'

  // Ce composant est purement logique et ne rend rien dans le DOM.
  return null;
}
