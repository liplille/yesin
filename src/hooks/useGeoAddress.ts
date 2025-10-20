// src/hooks/useGeoAddress.ts
import { useCallback, useEffect, useMemo, useState } from "react";

export type Status =
  | "idle"
  | "prompt"
  | "loading"
  | "success"
  | "denied"
  | "unsupported"
  | "error";

type Address = {
  line: string;
  lat: number;
  lon: number;
  city?: string | null;
  country?: string | null;
  raw?: any;
};

const LS_KEY = "geoAddress.cache.v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function readCache(): Address | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.value as Address;
  } catch {
    return null;
  }
}

function writeCache(value: Address) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), value }));
  } catch {}
}

function formatAddressFromNominatim(data: any): string {
  const a = data?.address ?? {};
  const number = a.house_number;
  const road = a.road || a.pedestrian || a.footway || a.cycleway || a.path;
  const postcode = a.postcode;
  const city =
    a.city || a.town || a.village || a.municipality || a.suburb || a.county;
  const country = a.country;
  const first = [number, road].filter(Boolean).join(" ");
  const second = [postcode, city].filter(Boolean).join(" ");
  const parts = [first || city, second].filter(Boolean);
  const base = parts.length
    ? parts.join(", ")
    : [city, country].filter(Boolean).join(", ");
  return base || "Localisation indisponible";
}

export function useGeoAddress(opts?: { autoRequest?: boolean }) {
  const { autoRequest = false } = opts ?? {};
  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const [status, setStatus] = useState<Status>("idle");
  const [address, setAddress] = useState<Address | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // AJOUT : Ce "verrou" empêche la réactivation automatique après une désactivation manuelle.
  const [isManuallyCleared, setIsManuallyCleared] = useState(false);

  // init (cache → success | prompt)
  useEffect(() => {
    if (!supported) {
      setStatus("unsupported");
      setMessage("Votre navigateur ne supporte pas la géolocalisation.");
      return;
    }
    const cached = readCache();
    if (cached) {
      setAddress(cached);
      setStatus("success");
    } else {
      setStatus("prompt");
    }
  }, [supported]);

  const doLocate = useCallback(() => {
    // Quand l'utilisateur clique pour activer, on retire le verrou.
    setIsManuallyCleared(false);

    if (!supported) {
      setStatus("unsupported");
      setMessage("Votre navigateur ne supporte pas la géolocalisation.");
      return;
    }
    setStatus("loading");
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          const url = new URL("https://nominatim.openstreetmap.org/reverse");
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("lat", String(lat));
          url.searchParams.set("lon", String(lon));
          url.searchParams.set("zoom", "18");
          url.searchParams.set("addressdetails", "1");

          const res = await fetch(url.toString(), {
            headers: { "Accept-Language": navigator.language || "fr-FR" },
          });
          if (!res.ok)
            throw new Error(`Reverse geocoding failed (${res.status})`);
          const data = await res.json();

          const a = data?.address ?? {};
          const city =
            a.city ||
            a.town ||
            a.village ||
            a.municipality ||
            a.suburb ||
            a.county ||
            null;
          const country = a.country || null;
          const line = formatAddressFromNominatim(data);

          const value: Address = { line, lat, lon, city, country, raw: data };
          setAddress(value);
          writeCache(value);
          setStatus("success");
        } catch (e) {
          console.error(e);
          setStatus("error");
          setMessage("Impossible de déterminer l’adresse.");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage(
            "Permission refusée. Vous devez l'autoriser dans les paramètres de votre navigateur."
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus("error");
          setMessage("Position indisponible.");
        } else if (err.code === err.TIMEOUT) {
          setStatus("error");
          setMessage("Délai dépassé lors de la localisation.");
        } else {
          setStatus("error");
          setMessage("Erreur de géolocalisation.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [supported]);

  const clearLocate = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setAddress(null);
    setStatus(supported ? "prompt" : "unsupported");
    setMessage(null);
    // On pose le verrou pour bloquer la réactivation automatique.
    setIsManuallyCleared(true);
  }, [supported]);

  // auto request (optionnel)
  useEffect(() => {
    // CORRECTION : On vérifie si le verrou est posé.
    if (!autoRequest || isManuallyCleared) return;
    if (status !== "prompt") return;

    if (
      "permissions" in navigator &&
      typeof (navigator as any).permissions?.query === "function"
    ) {
      (navigator.permissions as any)
        .query({ name: "geolocation" as PermissionName })
        .then((p: any) => {
          if (p.state === "granted" || p.state === "prompt") doLocate();
        })
        .catch(() => doLocate());
    } else {
      doLocate();
    }
  }, [autoRequest, status, doLocate, isManuallyCleared]); // Ajout de la dépendance

  const label = useMemo(() => {
    if (status === "loading") return "Détermination de votre adresse…";
    if (status === "success" && address) return address.line;
    if (status === "denied") return "Localisation refusée";
    if (status === "unsupported") return "Géolocalisation non supportée";
    if (status === "error") return "Adresse indisponible";
    return "Partager ma position pour afficher l’adresse";
  }, [status, address]);

  return {
    status,
    address,
    city: address?.city ?? null,
    country: address?.country ?? null,
    label,
    message,
    doLocate,
    clearLocate,
  };
}
