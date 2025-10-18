// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import RootLayout from "./layout/RootLayout";

// Lazy loading des pages
const GetStartedPage = lazy(() => import("./pages/GetStartedPage"));
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const CreatePitchPage = lazy(() => import("./pages/CreatePitchPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const OopsPage = lazy(() => import("./pages/OopsPage"));
// const OnboardingPage = lazy(() => import("./pages/OnboardingPage")); // si besoin plus tard

export default function App() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Page d'accueil */}
          <Route path="/" element={<GetStartedPage />} />

          {/* Nouvelles routes pour le flux d'authentification */}
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/create-pitch" element={<CreatePitchPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />

          {/* Autres pages */}
          {/* <Route path="/profil" element={<OnboardingPage />} /> */}

          {/* Page 404 */}
          <Route path="*" element={<OopsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
