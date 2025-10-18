// src/hooks/useSupabaseAuthListener.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export function useSupabaseAuthListener() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // La session initiale est récupérée, on arrête le chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Le listener est mis en place pour les changements futurs
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Si la session change, le chargement est terminé
      if (isLoading) setIsLoading(false);
    });

    // Nettoyage de l'abonnement
    return () => {
      subscription.unsubscribe();
    };
  }, [isLoading]);

  return { session, isLoading };
}
