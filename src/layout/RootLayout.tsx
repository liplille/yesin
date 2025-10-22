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

  const { status, error, address, locate, reset } = useGeoAddress({
    autoLocateOnMount: true,
  });
  // Derivés pour rester compatibles avec le composant GeoAddress + Outlet
  const city = address?.city ?? null;
  const label = address?.line ?? "";
  const message = error?.message ?? "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleGeoToggle = () => {
    if (status === "success") reset();
    else locate();
  };

  // ... (getGeoIconColor, getGeoTooltip, isLoading check restent identiques) ...
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
      {/* ... (Header reste identique) ... */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        {/* Padding ajusté */}
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
          context={{ session, geoCity: city } satisfies RootOutletContext}
        />
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 py-8 text-xs sm:text-sm opacity-80 md:flex-row md:gap-4">
          {/* Section Gauche: Copyright + Adresse */}
          {/* === MODIFICATION ICI === Ajout de min-w-0 */}
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left min-w-0">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 md:justify-start">
              <span>© {new Date().getFullYear()}</span>
              <span className="inline-flex items-baseline">
                <TextLogo />™
              </span>
              <span>Pour un web plus humain. Fait à Lille. 🌱</span>
            </div>
            {/* GeoAddress est maintenant limité en largeur grâce à ses classes internes max-w-* */}
            <GeoAddress
              status={status}
              label={label}
              message={message}
              onLocate={locate}
              onRefresh={locate}
            />
          </div>

          {/* Section Droite: Contact WhatsApp */}
          {/* === MODIFICATION ICI === Ajout de flex-shrink-0 */}
          <div className="flex items-center flex-shrink-0">
            {/* Utilisation de l'option 1 suggérée précédemment pour la clarté */}
            <div className="hidden md:flex md:items-center md:gap-3">
              <div className="flex flex-col text-xs text-right">
                <span className="font-semibold">Une question ?</span>
                <span className="opacity-70">Scannez pour WhatsApp</span>
              </div>
              <img
                src={qrWhatsapp}
                alt="QR WhatsApp"
                className="h-12 w-12 rounded bg-white p-1 flex-shrink-0" // flex-shrink-0 sur le QR code
              />
            </div>
            <a
              href="https://wa.me/3366668573"
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
