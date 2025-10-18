import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";

export default function WelcomePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // État pour l'erreur
  const navigate = useNavigate();

  const handleMagicLinkLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/create-pitch`,
      },
    });
    setLoading(false);

    if (error) setError(error.message);
    else navigate("/thank-you?mode=check-email");
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/create-pitch`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-3xl font-bold mb-2">Bienvenue 👋</h1>
      <p className="mb-6 opacity-80">
        Connectez-vous pour enregistrer votre pitch.
      </p>
      <AuthForm />
    </div>
  );
}
