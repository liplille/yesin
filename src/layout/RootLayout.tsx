// src/layout/RootLayout.tsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useSupabaseAuthListener } from "../hooks/useSupabaseAuthListener";
import ThemeToggle from "../components/ThemeToggle";
import TextLogo from "../components/TextLogo";
import { supabase } from "../lib/supabaseClient";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid";
import qrWhatsapp from "../assets/images/whatsapp-qr-code.png";
import { useState } from "react";

// ⬇️ import du composant géoloc (version avec onResolved)
import GeoAddress from "../components/GeoAddress";

// 👉 Export du type de contexte à réutiliser dans les pages
export type RootOutletContext = {
  session: ReturnType<typeof useSupabaseAuthListener>["session"];
  geoCity: string | null;
};

export default function RootLayout() {
  const { session, isLoading } = useSupabaseAuthListener();
  const navigate = useNavigate();

  // ⬇️ Ville détectée (null si inconnue / refusée)
  const [geoCity, setGeoCity] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return <div className="p-6">Chargement de la session…</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2">
            <TextLogo />
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
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

      <main className="mx-auto max-w-7xl px-6">
        {/* ⬇️ On expose session + geoCity aux pages */}
        <Outlet context={{ session, geoCity } satisfies RootOutletContext} />
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm opacity-80 md:flex-row">
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
            <div className="flex items-baseline gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="inline-flex items-baseline">
                <TextLogo />™
              </span>
              <span>- Pour un web plus humain. Fait à Lille. 🌱</span>
            </div>

            {/* ⬇️ On met à jour geoCity dès que la géoloc résout */}
            <GeoAddress
              autoRequest // ⬅️ NEW: demande au chargement si pas de cache
              onResolved={({ city }) => setGeoCity(city ? String(city) : null)}
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
