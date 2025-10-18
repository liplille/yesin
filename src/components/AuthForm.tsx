import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";

type AuthFormProps = {
  redirectTo?: string; // permet de rediriger vers /create-pitch ou autre
  buttonLabel?: string;
};

export default function AuthForm({
  redirectTo = "/create-pitch",
  buttonLabel = "Recevoir mon lien magique",
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleMagicLinkLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    });

    setLoading(false);

    if (error) setError(error.message);
    else navigate("/thank-you?mode=check-email");
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="w-full max-w-md text-center">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="mb-4 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white/10 px-7 py-3 font-semibold text-fg shadow-lg hover:bg-white/20"
      >
        <svg className="h-5 w-5" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
          />
          <path
            fill="#FF3D00"
            d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
          />
          <path
            fill="#1976D2"
            d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.089,5.571
l6.19,5.238C42.022,35.257,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"
          />
        </svg>
        S'inscrire avec Google
      </button>

      {/* Séparateur */}
      <div className="my-4 flex items-center">
        <hr className="flex-1 border-t border-black/10 dark:border-white/10" />
        <span className="px-4 text-xs uppercase opacity-70">ou</span>
        <hr className="flex-1 border-t border-black/10 dark:border-white/10" />
      </div>

      {/* Formulaire email */}
      <form onSubmit={handleMagicLinkLogin}>
        <input
          type="email"
          placeholder="Votre adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white/5 p-3 text-center dark:border-white/20"
          required
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-2xl bg-primary px-7 py-3 font-semibold text-white shadow-lg hover:opacity-90"
          disabled={loading}
        >
          {loading ? "Envoi en cours..." : buttonLabel}
        </button>
      </form>

      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
