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

export type RootOutletContext = {
  session: ReturnType<typeof useSupabaseAuthListener>["session"];
  geoCity: string | null;
};

export default function RootLayout() {
  const { session, isLoading } = useSupabaseAuthListener();
  const navigate = useNavigate();

  const { status, city, label, message, doLocate, clearLocate } = useGeoAddress(
    {
      autoRequest: true, // garde le comportement actuel
    }
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleGeoToggle = () => {
    if (status === "success") clearLocate();
    else doLocate();
  };

  const geoIconClassByStatus: Record<string, string> = {
    success: "text-green-500",
    loading: "text-yellow-500 animate-pulse",
    denied: "text-red-500",
    error: "text-red-500",
    idle: "text-gray-400",
    prompt: "text-gray-400",
    unsupported: "text-gray-400",
  };
  const getGeoIconColor = () => geoIconClassByStatus[status] ?? "text-gray-400";

  const tooltipByStatus: Record<string, string> = {
    success: "Désactiver la géolocalisation pour cette session",
    loading: "Géolocalisation en cours...",
    denied:
      "Géolocalisation bloquée. Modifiez les paramètres du site dans votre navigateur pour l'autoriser.",
    error: "Erreur de géolocalisation. Cliquez pour réessayer.",
    idle: "Activer la géolocalisation",
    prompt: "Activer la géolocalisation",
    unsupported: "Géolocalisation non supportée",
  };
  const getGeoTooltip = () =>
    tooltipByStatus[status] ?? "Activer la géolocalisation";

  if (isLoading) {
    return <div className="p-6">Chargement de la session…</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        {/* MODIFIÉ: px-4 sm:px-6 */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2">
            <TextLogo />
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleGeoToggle}
              title={getGeoTooltip()}
              aria-pressed={status === "success"}
              className="rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <MapPinIcon className={`h-6 w-6 ${getGeoIconColor()}`} />
            </button>
            {session && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-white/10"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* MODIFIÉ: px-4 sm:px-6 */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <Outlet
          context={{ session, geoCity: city } satisfies RootOutletContext}
        />
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        {/* MODIFIÉ: px-4 sm:px-6 */}
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 text-sm opacity-80 md:flex-row">
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
            <div className="flex items-baseline gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="inline-flex items-baseline">
                <TextLogo />™
              </span>
              <span>- Pour un web plus humain. Fait à Lille. 🌱</span>
            </div>

            <GeoAddress
              status={status}
              label={label}
              message={message}
              onLocate={doLocate}
              onRefresh={doLocate}
            />
          </div>

          <div className="flex items-center gap-6">
            <img
              src={qrWhatsapp}
              alt="QR WhatsApp"
              className="hidden h-10 w-10 rounded bg-white p-1 md:block"
            />
            <a
              href="https://wa.me/3366668573"
              className="rounded-lg bg-green-500 px-3 py-1 text-white md:hidden"
            >
              Contact WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
