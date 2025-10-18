// src/auth/RouteGate.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./../auth/AuthProvider";
import { useEphemeralFlag } from "../hooks/useEphemeralFlag";

type Mode = "any" | "auth" | "anon" | "email" | "audio";

type Props = {
  mode: Mode;
  children: JSX.Element;
  redirectTo?: string;
  emailParamName?: string; // "mode"
  emailParamValue?: string; // "check-email"
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

  // support du flag "éphémère" + support du state de navigation
  const ephemeralAudioFlag = useEphemeralFlag("audioSubmitted");
  const routeState =
    (location.state as { audioSubmitted?: boolean } | null) ?? null;
  const audioSubmitted = Boolean(
    routeState?.audioSubmitted || ephemeralAudioFlag
  );

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
      // Un utilisateur connecté n’a rien à faire ici → retour à create-pitch
      if (session) return <Navigate to="/create-pitch" replace />;
      const params = new URLSearchParams(location.search);
      const value = params.get(emailParamName);
      if (value === emailParamValue) return children;
      // si mauvais param, retour à l’accueil
      return <Navigate to="/" replace />;
    }

    case "audio":
      // Autorisé si connecté + flag présent (state ou ephemeral)
      if (session && audioSubmitted) return children;
      // UX: si connecté mais pas de flag → on le renvoie finir son pitch
      // si non connecté → welcome
      return <Navigate to={session ? "/create-pitch" : "/welcome"} replace />;

    default:
      return <Navigate to={redirectTo} replace />;
  }
}
