// src/hooks/useSupabaseAuthListener.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export function useSupabaseAuthListener() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // <-- Tableau de dépendances vidé

  return { session, isLoading };
}
