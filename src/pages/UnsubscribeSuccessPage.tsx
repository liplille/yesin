// src/pages/UnsubscribeSuccessPage.tsx
import { Link } from "react-router-dom";
import { CheckCircleIcon } from "@heroicons/react/24/outline"; // Icône de succès

export default function UnsubscribeSuccessPage() {
  return (
    // Même structure que ThankYouPage pour la cohérence
    <div className="py-24 sm:py-32 text-center">
      <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white/5 border border-black/10 dark:border-white/10 shadow-lg">
        {/* Icône de succès */}
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Désinscription Réussie ! ✅
        </h1>
        <p className="mb-6 opacity-80">
          Vous avez bien été désinscrit(e). Vous ne recevrez plus nos emails
          marketing aprés 1 semaine.
        </p>
        <Link
          to="/" // Lien vers l'accueil
          className="inline-block mt-4 px-5 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20"
        >
          Revenir à l’accueil
        </Link>
      </div>
    </div>
  );
}
