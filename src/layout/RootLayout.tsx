// src/layout/RootLayout.tsx
import { useEffect } from "react"; // Assurez-vous d'importer useEffect
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import TextLogo from "../components/TextLogo";
import { supabase } from "../lib/supabaseClient"; // Assurez-vous d'importer supabase
import {
  ArrowRightOnRectangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import qrWhatsapp from "../assets/images/whatsapp-qr-code.png";
import { useSupabaseAuthListener } from "../hooks/useSupabaseAuthListener";
import GeoAddress from "../components/GeoAddress";
import { useGeoAddress } from "../hooks/useGeoAddress";
// Importez le listener d'analytics
import AnalyticsRouterListener from "../components/AnalyticsRouterListener";

// Type pour le contexte de l'outlet
export type RootOutletContext = {
  session: ReturnType<typeof useSupabaseAuthListener>["session"];
  geoCity: string | null;
  geoCoords: { lat: number; lon: number } | null;
  geoLocate: () => void;
};

export default function RootLayout() {
  const { session, isLoading } = useSupabaseAuthListener();
  const navigate = useNavigate();

  // Hook pour la géolocalisation
  const { status, error, address, coords, locate, reset } = useGeoAddress({
    autoLocateOnMount: true,
  });
  const city = address?.city ?? null;
  const label = address?.line ?? "";
  const message = error?.message ?? "";

  // Détermine si l'utilisateur est authentifié
  const isAuthenticated = !!session;

  // --- Set GA4 User ID ---
  useEffect(() => {
    // S'exécute quand la session change (devient disponible ou nulle)
    if (session?.user?.id) {
      try {
        // Vérifie si gtag est disponible sur l'objet window
        if (window.gtag) {
          // Définit le user_id pour GA4
          window.gtag("set", { user_id: session.user.id });
          console.debug("[Analytics] GA User ID set:", session.user.id);
        } else {
          // Avertissement si gtag n'est pas trouvé (utile en dev)
          console.warn("[Analytics] window.gtag non trouvé pour set user_id.");
        }
      } catch (error) {
        // Capture les erreurs potentielles lors de l'appel à gtag
        console.error("[Analytics] Erreur GA set user_id:", error);
      }
    }
    // Si l'utilisateur se déconnecte, user_id sera implicitement null/non défini
    // pour les événements GA4 suivants envoyés depuis cette page/session.
  }, [session]); // Dépendance : se ré-exécute si l'objet session change
  // --- Fin Set GA4 User ID ---

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

  // Affiche un état de chargement tant que la session initiale n'est pas connue
  // pour éviter les rendus prématurés et le FOUC (Flash Of Unauthenticated Content)
  if (isLoading) {
    return <div className="p-6 text-center opacity-70">Chargement...</div>;
  }

  // Rendu principal une fois l'état d'authentification connu
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Intégration du Listener d'Analytics */}
      {/* Il est placé ici pour qu'il ait accès à `isAuthenticated` après le chargement initial */}
      <AnalyticsRouterListener isAuthenticated={isAuthenticated} />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2">
            <TextLogo />
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Bouton pour activer/désactiver/réessayer la géolocalisation */}
            <button
              onClick={handleGeoToggle}
              title={getGeoTooltip()}
              aria-label={getGeoTooltip()}
              aria-pressed={status === "success"}
              className="rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
              disabled={error?.code === "unsupported"} // Désactivé si non supporté
            >
              <MapPinIcon className={`h-6 w-6 ${getGeoIconColor()}`} />
            </button>
            {/* Bouton pour changer le thème (clair/sombre) */}
            <ThemeToggle />
            {/* Bouton de déconnexion, affiché seulement si l'utilisateur est connecté */}
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

      {/* Conteneur principal pour le contenu des pages */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Outlet rend le composant enfant correspondant à la route actuelle */}
        {/* Le contexte fournit la session et les infos de géoloc aux pages enfants */}
        <Outlet
          context={
            {
              session,
              geoCity: city,
              geoCoords: coords,
              geoLocate: locate,
            } satisfies RootOutletContext // Assure que le contexte correspond au type défini
          }
        />
      </main>

      {/* Pied de page */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 py-8 text-xs sm:text-sm opacity-80 md:flex-row md:gap-4">
          {/* Section gauche : Copyright, logo, slogan et état de la géoloc */}
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left min-w-0">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 md:justify-start">
              <span>© {new Date().getFullYear()}</span>
              <span className="inline-flex items-baseline">
                <TextLogo />™
              </span>
              <span>Pour un web plus humain. Fait à Lille. 🌱</span>
            </div>
            {/* Affiche l'adresse ou les contrôles de géolocalisation */}
            <GeoAddress
              status={status}
              label={label}
              message={message}
              onLocate={locate} // Action pour activer/réessayer
              onRefresh={locate} // Action pour rafraîchir (si déjà localisé)
              error={error} // Passe l'objet erreur complet pour différencier denied/error
            />
          </div>

          {/* Section droite : Contact WhatsApp (QR code pour desktop, lien pour mobile) */}
          <div className="flex items-center flex-shrink-0">
            {/* Affiché uniquement sur les écrans moyens et plus grands */}
            <div className="hidden md:flex md:items-center md:gap-3">
              <div className="flex flex-col text-xs text-right">
                <span className="font-semibold">Une question ?</span>
                <span className="opacity-70">Scannez pour WhatsApp</span>
              </div>
              <img
                src={qrWhatsapp}
                alt="QR Code pour contacter YesIn.media sur WhatsApp"
                className="h-12 w-12 rounded bg-white p-1 flex-shrink-0"
              />
            </div>
            {/* Affiché uniquement sur les petits écrans (mobile) */}
            <a
              href="https://wa.me/33666868573" // Mettez le bon numéro ici
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
