// src/components/AnalyticsTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Déclarez gtag et fbq au niveau global pour TypeScript
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
    fbq?: (...args: any[]) => void; // Ajout pour fbq
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // --- Google Analytics ---
    if (GA_MEASUREMENT_ID && window.gtag) {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search + location.hash,
        page_title: document.title,
      });
      console.log(
        `GA PageView: ${location.pathname + location.search + location.hash}`
      );
    } else if (!GA_MEASUREMENT_ID) {
      console.warn("Google Analytics Measurement ID is not defined.");
    }

    // --- Meta Pixel (Facebook Pixel) --- AJOUTEZ CECI ---
    if (window.fbq) {
      window.fbq("track", "PageView"); // Déclenche PageView à chaque changement de route
      console.log(
        `Meta Pixel PageView: ${
          location.pathname + location.search + location.hash
        }`
      );
    } else {
      console.warn("Meta Pixel (fbq) is not available.");
    }
    // --- Fin de l'ajout ---
  }, [location]); // Se déclenche à chaque changement de 'location'

  return null; // Ce composant ne rend rien visuellement
}
