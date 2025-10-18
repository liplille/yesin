// src/hooks/useEphemeralFlag.ts
import { useEffect, useState } from "react";

export function useEphemeralFlag(key: string) {
  // On lit la valeur initiale depuis le sessionStorage
  const storageValue = sessionStorage.getItem(key) === "true";
  const [value, setValue] = useState(storageValue);

  useEffect(() => {
    // Si la valeur était présente, on la "consomme" en la supprimant
    if (storageValue) {
      sessionStorage.removeItem(key);
      // On s'assure que le state est bien à jour
      setValue(true);
    }
  }, [storageValue, key]);

  return value;
}
