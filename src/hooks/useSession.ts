// src/hooks/useSession.ts
import { useOutletContext } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

// Hook typé pour accéder au contexte de l'Outlet du RootLayout
export function useSession() {
  return useOutletContext<{ session: Session | null }>();
}
