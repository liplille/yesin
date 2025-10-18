// src/layout/RootLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import TextLogo from "../components/TextLogo";

import qrWhatsapp from "../assets/images/whatsapp-qr-code.png";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-bg/70 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo cliquable vers la home */}
          <NavLink to="/" className="flex items-center gap-2">
            <TextLogo />
          </NavLink>

          {/* Toggle thème à droite */}
          <ThemeToggle />
        </div>
      </header>

      {/* Contenu des pages */}
      <main className="mx-auto max-w-7xl px-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm opacity-80 md:flex-row">
          <div className="flex flex-col items-center gap-2 text-center md:flex-row md:text-left">
            © {new Date().getFullYear()} <TextLogo />™{" "}
            <span>Pour un web plus humain. Fait à Lille. 🌱</span>
          </div>

          <div className="flex items-center gap-6">
            {/* QR Code visible uniquement sur desktop */}
            <img
              src={qrWhatsapp}
              alt="QR WhatsApp"
              className="hidden h-10 w-10 rounded bg-white p-1 md:block"
            />
            {/* Lien visible uniquement sur mobile */}
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
