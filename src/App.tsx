// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import RootLayout from "./layout/RootLayout";

const HomePage = lazy(() => import("./pages/HomePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
// const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          {/* <Route path="/profil" element={<OnboardingPage />} /> */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
