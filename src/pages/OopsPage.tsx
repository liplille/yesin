// src/pages/NotFoundPage.tsx
import { Link } from "react-router-dom";

export default function OopsPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold mb-2">Page introuvable</h1>
      <p className="mb-6 opacity-80">Oups, cette page n’existe pas (encore).</p>
      <Link to="/" className="underline">
        Revenir à l’accueil
      </Link>
    </div>
  );
}
