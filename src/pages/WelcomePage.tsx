import AuthForm from "../components/AuthForm";

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-3xl font-bold mb-2">Bienvenue 👋</h1>
      <p className="mb-6 opacity-80">
        Identifiez-vous pour que votre communauté découvre enfin votre voix.
      </p>
      <AuthForm />
    </div>
  );
}
