// src/pages/ThankYouPage.tsx
import { Link } from "react-router-dom";

type ThankYouPageProps = {
  variant: "check-email" | "submitted";
};

export default function ThankYouPage({ variant }: ThankYouPageProps) {
  return (
    <div className="py-20 text-center">
      {variant === "check-email" ? (
        <>
          <h1 className="text-3xl font-bold mb-2">
            Vérifiez votre boîte mail 📧
          </h1>
          <p className="mb-6 opacity-80">
            Nous vous avons envoyé un lien d'accès direct pour enregistrer votre
            annonce gratuite.
          </p>
        </>
      ) : variant === "submitted" ? (
        <>
          <h1 className="text-3xl font-bold mb-2">Merci 🙏</h1>
          <p className="mb-6 opacity-80">
            Votre pitch a bien été envoyé. Nous l’écouterons bientôt.
          </p>
        </>
      ) : null}{" "}
      {/* Ajout du cas final pour rendre la condition explicite et complète */}
      <Link to="/" className="underline">
        Revenir à l’accueil
      </Link>
    </div>
  );
}
