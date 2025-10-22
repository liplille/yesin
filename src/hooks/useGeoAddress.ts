// src/hooks/useGeoAddress.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Configuration
 */
const GEOCODER_URL = import.meta.env.VITE_PUBLIC_GEOCODE_URL as
  | string
  | undefined;
const DEFAULT_LANG = "fr";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const ROUND_COORDS = 5; // précision pour la clé de cache lat/lon

/**
 * Types d'erreur côté hook
 */
export type GeoErrorCode =
  | "denied" // permission navigateur refusée
  | "unsupported" // geolocation indisponible
  | "timeout" // délai dépassé (nav ou fetch)
  | "network" // erreur réseau fetch
  | "rate_limited" // 429 Nominatim
  | "forbidden" // 403 Nominatim
  | "upstream_error" // 5xx/erreur autre Nominatim (via proxy)
  | "bad_request" // mauvais paramètres envoyés
  | "internal" // erreur inattendue (client)
  | "missing_config"; // VITE_PUBLIC_GEOCODE_URL absent

export type GeoStatus = "idle" | "locating" | "loading" | "success" | "error";

export type GeoAddress = {
  line: string; // ligne d'adresse formatée
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
  raw?: any; // payload Nominatim utile si besoin
};

export type UseGeoAddressOptions = {
  lang?: string; // langue pour Nominatim (fr par défaut)
  autoLocateOnMount?: boolean; // true => tente la géoloc au mount
  highAccuracy?: boolean; // geolocation option
  timeoutMs?: number; // geolocation timeout
  maximumAgeMs?: number; // geolocation cache age
};

export type UseGeoAddressResult = {
  status: GeoStatus;
  error: { code: GeoErrorCode; message: string } | null;
  coords: { lat: number; lon: number } | null;
  address: GeoAddress | null;
  /**
   * Démarre une géolocalisation navigateur puis reverse-geocode côté Edge.
   */
  locate: () => Promise<void>;
  /**
   * Reverse geocode sans géolocalisation (tu passes lat/lon).
   */
  reverse: (lat: number, lon: number) => Promise<GeoAddress | null>;
  /**
   * Recherche textuelle d'adresse (forward search). Retourne une liste condensée.
   */
  search: (query: string, limit?: number) => Promise<GeoAddress[]>;
  /**
   * Reset les états (utile si on veut relancer proprement)
   */
  reset: () => void;
};

/* ------------------------------------------
 * Utils
 * ------------------------------------------ */

function roundCoord(n: number, digits = ROUND_COORDS) {
  return Number(n.toFixed(digits));
}

function cacheKeyReverse(lat: number, lon: number, lang: string) {
  return `geocode:reverse:${roundCoord(lat)},${roundCoord(lon)}:${lang}`;
}

function cacheKeySearch(q: string, lang: string, limit: number) {
  return `geocode:search:${q.trim().toLowerCase()}:${lang}:${limit}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const str = localStorage.getItem(key);
    if (!str) return null;
    const { t, v } = JSON.parse(str);
    if (Date.now() - t > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return v as T;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // ignore quota errors
  }
}

function formatAddressFromNominatimReverse(p: any): GeoAddress {
  // reverse renvoie un objet
  const a = p?.address ?? {};
  const parts = [
    p?.name,
    a?.house_number && a?.road ? `${a.house_number} ${a.road}` : a?.road,
    a?.neighbourhood,
    a?.suburb,
    a?.city || a?.town || a?.village || a?.municipality,
    a?.postcode,
    a?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    line: parts || p?.display_name || "",
    city: a?.city || a?.town || a?.village || a?.municipality || null,
    postcode: a?.postcode ?? null,
    country: a?.country ?? null,
    lat: Number(p?.lat),
    lon: Number(p?.lon),
    raw: p,
  };
}

function formatAddressFromNominatimSearch(p: any): GeoAddress {
  // search renvoie un tableau d'objets
  const a = p?.address ?? {};
  const parts = [
    p?.name,
    a?.house_number && a?.road ? `${a.house_number} ${a.road}` : a?.road,
    a?.neighbourhood,
    a?.suburb,
    a?.city || a?.town || a?.village || a?.municipality,
    a?.postcode,
    a?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    line: parts || p?.display_name || "",
    city: a?.city || a?.town || a?.village || a?.municipality || null,
    postcode: a?.postcode ?? null,
    country: a?.country ?? null,
    lat: Number(p?.lat),
    lon: Number(p?.lon),
    raw: p,
  };
}

function mapServerError(json: any): { code: GeoErrorCode; message: string } {
  const code = (json?.code as GeoErrorCode) ?? "upstream_error";
  const message =
    json?.message ??
    (
      {
        rate_limited: "Trop de requêtes. Réessayez dans quelques instants.",
        forbidden: "Accès refusé par le service d'adressage.",
        upstream_error: "Le service d'adressage est indisponible.",
        bad_request: "Requête invalide.",
        timeout: "Délai dépassé.",
        internal: "Erreur interne.",
      } as Record<GeoErrorCode, string>
    )[code] ??
    "Erreur inconnue.";
  return { code, message };
}

/* ------------------------------------------
 * Appels HTTP (via Edge Function)
 * ------------------------------------------ */

async function callReverse(
  urlBase: string,
  lat: number,
  lon: number,
  lang: string,
  signal?: AbortSignal
): Promise<GeoAddress> {
  const u = new URL(urlBase);
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("lang", lang);

  const resp = await fetch(u.toString(), { signal });
  let json: any = null;

  try {
    json = await resp.json();
  } catch {
    throw {
      code: "upstream_error",
      message: `Réponse invalide (${resp.status})`,
    } as {
      code: GeoErrorCode;
      message: string;
    };
  }

  if (!resp.ok || !json) {
    throw mapServerError(json);
  }
  if (json.ok !== true) {
    throw mapServerError(json);
  }

  return formatAddressFromNominatimReverse(json.data);
}

async function callSearch(
  urlBase: string,
  q: string,
  lang: string,
  limit: number,
  signal?: AbortSignal
): Promise<GeoAddress[]> {
  const u = new URL(urlBase);
  u.searchParams.set("q", q);
  u.searchParams.set("lang", lang);
  u.searchParams.set("limit", String(limit));

  const resp = await fetch(u.toString(), { signal });
  let json: any = null;

  try {
    json = await resp.json();
  } catch {
    throw {
      code: "upstream_error",
      message: `Réponse invalide (${resp.status})`,
    } as {
      code: GeoErrorCode;
      message: string;
    };
  }

  if (!resp.ok || !json) {
    throw mapServerError(json);
  }
  if (json.ok !== true) {
    throw mapServerError(json);
  }

  const arr: any[] = Array.isArray(json.data)
    ? json.data
    : [json.data].filter(Boolean);
  return arr.map(formatAddressFromNominatimSearch);
}

/* ------------------------------------------
 * Hook principal
 * ------------------------------------------ */

export function useGeoAddress(
  options: UseGeoAddressOptions = {}
): UseGeoAddressResult {
  const {
    lang = DEFAULT_LANG,
    autoLocateOnMount = false,
    highAccuracy = false,
    timeoutMs = 8000,
    maximumAgeMs = 30000,
  } = options;

  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<UseGeoAddressResult["error"]>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [address, setAddress] = useState<GeoAddress | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const urlBase = useMemo(() => GEOCODER_URL, []);

  const setErr = useCallback((code: GeoErrorCode, message?: string) => {
    setStatus("error");
    setError({
      code,
      message:
        message ??
        (
          {
            denied: "Vous avez refusé la géolocalisation.",
            unsupported: "Votre navigateur ne supporte pas la géolocalisation.",
            timeout: "La géolocalisation a expiré.",
            network: "Erreur réseau, vérifiez votre connexion.",
            rate_limited: "Trop de requêtes. Réessayez bientôt.",
            forbidden: "Accès refusé par le service d'adressage.",
            upstream_error: "Le service d'adressage est indisponible.",
            bad_request: "Requête invalide.",
            internal: "Erreur interne.",
            missing_config:
              "Configuration manquante : VITE_PUBLIC_GEOCODE_URL n'est pas défini.",
          } as Record<GeoErrorCode, string>
        )[code] ??
        "Erreur inconnue.",
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setError(null);
    setCoords(null);
    setAddress(null);
  }, []);

  const reverse = useCallback(
    async (lat: number, lon: number) => {
      if (!urlBase) {
        setErr("missing_config");
        return null;
      }

      // cache
      const ck = cacheKeyReverse(lat, lon, lang);
      const cached = readCache<GeoAddress>(ck);
      if (cached) {
        setCoords({ lat, lon });
        setAddress(cached);
        setStatus("success");
        return cached;
      }

      // abort précédent
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setStatus("loading");
      setError(null);

      try {
        const addr = await callReverse(urlBase, lat, lon, lang, ctrl.signal);
        writeCache(ck, addr);
        setCoords({ lat, lon });
        setAddress(addr);
        setStatus("success");
        return addr;
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setErr("timeout", "Délai dépassé.");
          return null;
        }
        const code = (e?.code as GeoErrorCode) ?? "internal";
        const msg = (e?.message as string) ?? undefined;
        setErr(code, msg);
        return null;
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [lang, setErr, urlBase]
  );

  const search = useCallback(
    async (query: string, limit = 5) => {
      if (!urlBase) {
        setErr("missing_config");
        return [];
      }
      const q = query.trim();
      if (!q) return [];

      // cache
      const ck = cacheKeySearch(q, lang, limit);
      const cached = readCache<GeoAddress[]>(ck);
      if (cached) return cached;

      // abort précédent
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setStatus("loading");
      setError(null);

      try {
        const list = await callSearch(urlBase, q, lang, limit, ctrl.signal);
        writeCache(ck, list);
        setStatus("success");
        return list;
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setErr("timeout", "Délai dépassé.");
          return [];
        }
        const code = (e?.code as GeoErrorCode) ?? "internal";
        const msg = (e?.message as string) ?? undefined;
        setErr(code, msg);
        return [];
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [lang, setErr, urlBase]
  );

  const locate = useCallback(async () => {
    if (!urlBase) {
      setErr("missing_config");
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErr("unsupported");
      return;
    }

    // abort précédent
    abortRef.current?.abort();
    abortRef.current = null;

    setStatus("locating");
    setError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          // si on a déjà en cache, retour immédiat
          const ck = cacheKeyReverse(latitude, longitude, lang);
          const cached = readCache<GeoAddress>(ck);
          if (cached) {
            setCoords({ lat: latitude, lon: longitude });
            setAddress(cached);
            setStatus("success");
            resolve();
            return;
          }

          // sinon, reverse
          await reverse(latitude, longitude);
          resolve();
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setErr("denied");
          else if (err.code === err.POSITION_UNAVAILABLE) setErr("unsupported");
          else if (err.code === err.TIMEOUT) setErr("timeout");
          else setErr("internal", err.message);
          resolve();
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: maximumAgeMs,
        }
      );
    });
  }, [highAccuracy, lang, maximumAgeMs, reverse, setErr, timeoutMs, urlBase]);

  useEffect(() => {
    if (autoLocateOnMount) {
      // ne pas bloquer le render initial
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      locate();
    }
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    error,
    coords,
    address,
    locate,
    reverse,
    search,
    reset,
  };
}
