// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import RootLayout from "./layout/RootLayout";

const GetStartedPage = lazy(() => import("./pages/GetStartedPage"));
const OopsPage = lazy(() => import("./pages/OopsPage"));
// const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<GetStartedPage />} />
          {/* <Route path="/profil" element={<OnboardingPage />} /> */}
          <Route path="*" element={<OopsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
