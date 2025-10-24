// src/layout/RootLayout.tsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import TextLogo from "../components/TextLogo";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowRightOnRectangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import qrWhatsapp from "../assets/images/whatsapp-qr-code.png";
import { useSupabaseAuthListener } from "../hooks/useSupabaseAuthListener";
import GeoAddress from "../components/GeoAddress";
import { useGeoAddress } from "../hooks/useGeoAddress";
// Retrait de l'import Session inutilisé
// import type { Session } from "@supabase/supabase-js";

// Type pour le contexte de l'outlet
export type RootOutletContext = {
  session: ReturnType<typeof useSupabaseAuthListener>["session"];
  geoCity: string | null;
  geoCoords: { lat: number; lon: number } | null;
  geoLocate: () => void; // Ajout de la fonction locate
};

export default function RootLayout() {
  const { session, isLoading } = useSupabaseAuthListener();
  const navigate = useNavigate();

  // coords est bien utilisé maintenant dans le contexte
  const { status, error, address, coords, locate, reset } = useGeoAddress({
    autoLocateOnMount: true,
  });
  const city = address?.city ?? null;
  const label = address?.line ?? "";
  const message = error?.message ?? "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleGeoToggle = () => {
    if (status === "success") {
      reset();
    } else if (status === "idle" || status === "error") {
      locate();
    }
    // Ne fait rien si 'loading' ou 'locating'
  };

  const getGeoIconColor = () => {
    if (status === "success") return "text-green-500";
    if (status === "loading" || status === "locating")
      return "text-yellow-500 animate-pulse";
    if (status === "error") return "text-red-500";
    return "text-gray-400";
  };

  const getGeoTooltip = () => {
    if (status === "success")
      return "Désactiver la géolocalisation pour cette session";
    if (status === "loading" || status === "locating")
      return "Géolocalisation en cours...";
    if (status === "error") {
      if (error?.code === "unsupported") {
        return "Géolocalisation non supportée par votre navigateur.";
      }
      if (error?.code === "denied") {
        return "Géolocalisation bloquée. Cliquez pour réessayer (vérifiez les permissions).";
      }
      return `Erreur: ${message}. Cliquez pour réessayer.`;
    }
    return "Activer la géolocalisation"; // idle
  };

  if (isLoading) {
    return <div className="p-6">Chargement de la session…</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2">
            <TextLogo />
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleGeoToggle}
              title={getGeoTooltip()}
              aria-label={getGeoTooltip()}
              aria-pressed={status === "success"}
              className="rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
              disabled={error?.code === "unsupported"}
            >
              <MapPinIcon className={`h-6 w-6 ${getGeoIconColor()}`} />
            </button>
            <ThemeToggle />
            {session && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 hover:text-red-500 dark:border-white/10 transition-colors"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <Outlet
          context={
            {
              session,
              geoCity: city,
              geoCoords: coords, // Passer les coords
              geoLocate: locate, // Passer la fonction locate
            } satisfies RootOutletContext
          }
        />
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 py-8 text-xs sm:text-sm opacity-80 md:flex-row md:gap-4">
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left min-w-0">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 md:justify-start">
              <span>© {new Date().getFullYear()}</span>
              <span className="inline-flex items-baseline">
                <TextLogo />™
              </span>
              <span>Pour un web plus humain. Fait à Lille. 🌱</span>
            </div>
            {/* Passer locate comme onRefresh et onLocate ici */}
            <GeoAddress
              status={status}
              label={label}
              message={message}
              onLocate={locate} // Bouton principal 'Activer/Réessayer'
              onRefresh={locate} // Bouton 'Mettre à jour' (si succès) appelle aussi locate
              error={error}
            />
          </div>

          <div className="flex items-center flex-shrink-0">
            <div className="hidden md:flex md:items-center md:gap-3">
              <div className="flex flex-col text-xs text-right">
                <span className="font-semibold">Une question ?</span>
                <span className="opacity-70">Scannez pour WhatsApp</span>
              </div>
              <img
                src={qrWhatsapp}
                alt="QR WhatsApp"
                className="h-12 w-12 rounded bg-white p-1 flex-shrink-0"
              />
            </div>
            <a
              href="https://wa.me/3366668573" // Assurez-vous que c'est le bon numéro
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-500 px-3 py-1.5 text-xs text-white md:hidden"
            >
              Contact WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
