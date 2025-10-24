// src/pages/ThankYouPage.tsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, EnvelopeIcon } from "@heroicons/react/24/outline"; // Importe les icônes

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

type ThankYouPageProps = {
  variant: "check-email" | "submitted";
};

export default function ThankYouPage({ variant }: ThankYouPageProps) {
  useEffect(() => {
    if (!window.fbq) return;
    const key =
      variant === "check-email" ? "conv1:lead:fired" : "conv4:submitted:fired";

    if (!sessionStorage.getItem(key)) {
      if (variant === "check-email") {
        window.fbq("track", "Lead"); // CONVERSION 1
      } else if (variant === "submitted") {
        window.fbq("track", "SubmitApplication", { content_category: "pitch" }); // CONVERSION 4
      }
      sessionStorage.setItem(key, "1");
    }
  }, [variant]);
  return (
    // Augmente le padding vertical global
    <div className="py-24 sm:py-32 text-center">
      {/* Ajout d'un conteneur avec un peu de style */}
      <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white/5 border border-black/10 dark:border-white/10 shadow-lg">
        {variant === "check-email" ? (
          <>
            {/* Icône Email */}
            <EnvelopeIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Confirmation en attente dans vos emails ! 📧
            </h1>
            <p className="mb-6 opacity-80">
              Nous vous avons envoyé un lien d'accès direct pour enregistrer
              votre annonce gratuite. Cliquez dessus pour continuer !
            </p>
          </>
        ) : variant === "submitted" ? (
          <>
            {/* Icône de succès */}
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Merci pour votre voix ! 🙏
            </h1>
            <p className="mb-6 opacity-80">
              Pitch bien reçu ! Nous l'écoutons attentivement avant de le
              partager avec votre communauté locale. Merci pour votre
              contribution !
            </p>
          </>
        ) : null}
        <Link
          to="/"
          className="inline-block mt-4 px-5 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20"
        >
          Revenir à l’accueil
        </Link>
      </div>
    </div>
  );
}
