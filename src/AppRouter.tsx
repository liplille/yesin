// src/AppRouter.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteGate } from "./auth/RouteGate";

// Pages
import GetStartedPage from "./pages/GetStartedPage";
import OopsPage from "./pages/OopsPage";
import WelcomePage from "./pages/WelcomePage";
import CreatePitchPage from "./pages/CreatePitchPage";
import ThankYouPage from "./pages/ThankYouPage"; // page unifiée (variant)
import AuthCallback from "./pages/AuthCallback";

const router = createBrowserRouter([
  {
    // L'élément englobant contient maintenant RootLayout ET AnalyticsTracker

    children: [
      // Accueil public
      {
        path: "/",
        element: (
          <RouteGate mode="any">
            <GetStartedPage />
          </RouteGate>
        ),
      },
      { path: "/auth/callback", element: <AuthCallback /> },

      // Page d’erreur dédiée (optionnelle : on garde /oops si tu veux un lien direct)
      {
        path: "/oops",
        element: (
          <RouteGate mode="any">
            <OopsPage />
          </RouteGate>
        ),
      },

      // Auth — anonymes uniquement
      {
        path: "/welcome",
        element: (
          <RouteGate mode="anon">
            <WelcomePage />
          </RouteGate>
        ),
      },

      // Pitch — uniquement connecté
      {
        path: "/create-pitch",
        element: (
          <RouteGate mode="auth">
            <CreatePitchPage />
          </RouteGate>
        ),
      },

      // Merci "check email" — accès via ?mode=check-email
      {
        path: "/thank-you",
        element: (
          <RouteGate mode="email">
            <ThankYouPage variant="check-email" />
          </RouteGate>
        ),
      },

      // Merci après envoi audio — nécessite le flag (cf. RouteGate)
      {
        path: "/thank-you/submitted",
        element: (
          <RouteGate mode="audio">
            <ThankYouPage variant="submitted" />
          </RouteGate>
        ),
      },

      // Fallback : retourne à l’accueil
      {
        path: "*",
        element: (
          <RouteGate mode="any">
            <GetStartedPage />
          </RouteGate>
        ),
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
