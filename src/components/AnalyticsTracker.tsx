// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Déclarez gtag au niveau global pour TypeScript
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      console.warn("Google Analytics Measurement ID is not defined.");
      return;
    }

    if (window.gtag) {
      // Envoie l'événement page_view avec le nouveau chemin
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search + location.hash,
        page_title: document.title, // Vous pouvez personnaliser le titre si nécessaire
      });
      console.log(
        `GA PageView: ${location.pathname + location.search + location.hash}`
      );
    }
  }, [location]); // Se déclenche à chaque changement de 'location'

  return null; // Ce composant ne rend rien visuellement
}
