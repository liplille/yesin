// src/AppRouter.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteGate } from "./auth/RouteGate";
import RootLayout from "./layout/RootLayout"; // Import RootLayout

// Pages
import GetStartedPage from "./pages/GetStartedPage";
import OopsPage from "./pages/OopsPage";
import WelcomePage from "./pages/WelcomePage";
import CreatePitchPage from "./pages/CreatePitchPage";
import ThankYouPage from "./pages/ThankYouPage";
import AuthCallback from "./pages/AuthCallback";

const router = createBrowserRouter([
  {
    // ✅ RootLayout is now the main element for this route branch
    element: <RootLayout />,
    // Optional: Add an error element for errors within the layout itself
    // errorElement: <SomeErrorBoundary />,
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
      // Callback Supabase (doesn't need the main layout usually, but can stay here)
      { path: "/auth/callback", element: <AuthCallback /> },

      // Page d’erreur dédiée
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

      // Merci "check email"
      {
        path: "/thank-you",
        element: (
          <RouteGate mode="email">
            <ThankYouPage variant="check-email" />
          </RouteGate>
        ),
      },

      // Merci après envoi audio
      {
        path: "/thank-you/submitted",
        element: (
          <RouteGate mode="audio">
            <ThankYouPage variant="submitted" />
          </RouteGate>
        ),
      },

      // Fallback : retourne à l’accueil (ou affiche OopsPage)
      {
        path: "*",
        element: (
          <RouteGate mode="any">
            {/* Ou redirige vers OopsPage pour plus de clarté */}
            <OopsPage />
            {/* <GetStartedPage /> */}
          </RouteGate>
        ),
      },
    ],
  },
  // You could define other top-level routes here if they don't use RootLayout
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
