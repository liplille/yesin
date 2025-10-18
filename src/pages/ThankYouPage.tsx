import { useLocation, Link } from "react-router-dom";

export default function ThankYouPage() {
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get("mode");

  return (
    <div className="py-20 text-center">
      {mode === "check-email" ? (
        <>
          <h1 className="text-3xl font-bold mb-2">
            Vérifiez votre boîte mail 📧
          </h1>
          <p className="mb-6 opacity-80">
            Un lien magique vient de vous être envoyé pour confirmer votre
            adresse.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-2">Merci 🙏</h1>
          <p className="mb-6 opacity-80">
            Votre pitch a bien été envoyé. Nous l’écouterons bientôt.
          </p>
        </>
      )}
      <Link to="/" className="underline">
        Revenir à l’accueil
      </Link>
    </div>
  );
}
