// src/AppRouter.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./layout/RootLayout";
import { RouteGate } from "./auth/RouteGate";

// Pages
import GetStartedPage from "./pages/GetStartedPage";
import OopsPage from "./pages/OopsPage";
import WelcomePage from "./pages/WelcomePage";
import CreatePitchPage from "./pages/CreatePitchPage";
import ThankYouPage from "./pages/ThankYouPage"; // Utiliser la page unifiée

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Accessible par tous
      {
        path: "/get-started",
        element: (
          <RouteGate mode="any">
            <GetStartedPage />
          </RouteGate>
        ),
      },
      {
        path: "/oops",
        element: (
          <RouteGate mode="any">
            <OopsPage />
          </RouteGate>
        ),
      },

      // Uniquement hors connexion
      {
        path: "/welcome",
        element: (
          <RouteGate mode="anon">
            <WelcomePage />
          </RouteGate>
        ),
      },

      // Uniquement connecté
      {
        path: "/create-pitch",
        element: (
          <RouteGate mode="auth">
            <CreatePitchPage />
          </RouteGate>
        ),
      },

      // Cas spécial: lien e-mail
      {
        path: "/thank-you",
        element: (
          <RouteGate mode="email">
            {/* CETTE LIGNE EST CRUCIALE */}
            <ThankYouPage variant="check-email" />
          </RouteGate>
        ),
      },

      // Cas spécial: après envoi audio
      {
        path: "/thank-you/submitted",
        element: (
          <RouteGate mode="audio">
            {/* ET CELLE-CI AUSSI */}
            <ThankYouPage variant="submitted" />
          </RouteGate>
        ),
      },

      // fallback: redirige sobrement vers get-started
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
