// src/pages/WelcomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthForm from "../components/AuthForm";

export default function WelcomePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Déjà connecté → redirection immédiate, on n'affiche pas /welcome
          navigate("/create-pitch", { replace: true });
          return;
        }
      } catch (e) {
        // on ne bloque pas l'affichage si une erreur survient
        console.error("[WelcomePage] getSession error:", e);
      }
      setChecking(false);
    })();
  }, [navigate]);

  // Ne rien rendre pendant la vérification : évite tout PageView sur /welcome si connecté
  if (checking) return null;

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="mb-2 text-3xl font-bold">Bienvenue 👋</h1>
      <p className="mb-6 opacity-80">
        Identifiez-vous pour que votre communauté découvre enfin votre voix.
      </p>
      <AuthForm />
    </div>
  );
}
