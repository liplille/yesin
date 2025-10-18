// src/auth/RouteGate.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEphemeralFlag } from "../hooks/useEphemeralFlag";

type Mode = "any" | "auth" | "anon" | "email" | "audio";

type Props = {
  mode: Mode;
  children: JSX.Element;
  // Où rediriger si l'accès est refusé
  redirectTo?: string;
  // Pour email: nom du param et valeur attendue
  emailParamName?: string; // "mode"
  emailParamValue?: string; // "check-email"
  // Pour auth: chemin “from” mémorisé
  rememberFrom?: boolean;
};

function LoadingSplash() {
  return <div className="p-6">Chargement…</div>;
}

export function RouteGate({
  mode,
  children,
  redirectTo = "/oops",
  emailParamName = "mode",
  emailParamValue = "check-email",
  rememberFrom = true,
}: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const audioSubmitted = useEphemeralFlag("audioSubmitted");

  if (loading) return <LoadingSplash />;

  switch (mode) {
    case "any":
      return children;

    case "auth":
      if (session) return children;
      return (
        <Navigate
          to="/welcome"
          replace
          state={rememberFrom ? { from: location } : undefined}
        />
      );

    case "anon":
      if (!session) return children;
      return <Navigate to="/create-pitch" replace />;

    case "email": {
      // RÈGLE AJOUTÉE : Un utilisateur connecté n'a rien à faire ici.
      if (session) {
        return <Navigate to="/create-pitch" replace />;
      }
      const params = new URLSearchParams(location.search);
      const value = params.get(emailParamName);
      if (value === emailParamValue) return children;
      return <Navigate to="/get-started" replace />;
    }

    case "audio":
      if (session && audioSubmitted) return children;
      // Si pas connecté -> vers welcome, sinon vers oops
      return <Navigate to={session ? "/oops" : "/welcome"} replace />;

    default:
      return <Navigate to="/oops" replace />;
  }
}
