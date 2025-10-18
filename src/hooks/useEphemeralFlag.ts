// src/hooks/useEphemeralFlag.ts
import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export function useEphemeralFlag(key: string) {
  const location = useLocation() as any;
  const consumedRef = useRef(false);

  const stateValue = location.state?.[key];
  const storageValue = sessionStorage.getItem(key) === "true";
  const initial = Boolean(stateValue ?? storageValue);

  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (consumedRef.current) return;
    if (stateValue === true) sessionStorage.setItem(key, "true");
    // Consomme à la première lecture (one-shot)
    if (initial) {
      consumedRef.current = true;
      setValue(true);
      sessionStorage.removeItem(key);
      // Optionnel: nettoyer l'état d'histo (évite re-navigation avec state)
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
