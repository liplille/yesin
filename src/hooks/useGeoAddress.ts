// src/hooks/useGeoAddress.ts
// OPTION A: Appel d'une Supabase Edge Function distante (hébergée)
// - Ajoute les bons headers (Authorization + apikey) pour éviter 401
// - Gère denied/timeout/network/rate_limited/forbidden/upstream_error/bad_request/internal
// - Auto-locate au mount uniquement si permission déjà "granted" (Permissions API)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ----------------------- Config -----------------------

const GEOCODER_URL = import.meta.env.VITE_PUBLIC_GEOCODE_URL || ""; // https://<ref>.supabase.co/functions/v1/geocode
const DEFAULT_LANG = "fr";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// IMPORTANT: on a besoin de l'anon key pour appeler la function si pas de session
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// ----------------------- Types -----------------------

export type GeoErrorCode =
  | "denied"
  | "unsupported"
  | "timeout"
  | "network"
  | "rate_limited"
  | "forbidden"
  | "upstream_error"
  | "bad_request"
  | "internal"
  | "missing_config";

export type GeoStatus = "idle" | "locating" | "loading" | "success" | "error";
export type GeoAddress = {
  line: string;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
  raw?: any;
};

export type UseGeoAddressOptions = {
  lang?: string;
  autoLocateOnMount?: boolean; // false recommandé pour éviter le warning ; gating activé si true
  highAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
};

// ----------------------- Utils -----------------------

function ckReverse(lat: number, lon: number, lang: string) {
  return `geocode:reverse:${lat.toFixed(4)},${lon.toFixed(4)}:${lang}`;
}
function ckSearch(q: string, lang: string, limit: number) {
  return `geocode:search:${q.trim().toLowerCase()}:${lang}:${limit}`;
}

function readCache<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    if (!s) return null;
    const { t, v } = JSON.parse(s);
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
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // quota ignore
  }
}

function formatReverse(data: any): GeoAddress {
  const a = data?.address ?? {};
  const parts = [
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
    line: parts || data?.display_name || "",
    city: a?.city || a?.town || a?.village || a?.municipality || null,
    postcode: a?.postcode ?? null,
    country: a?.country ?? null,
    lat: parseFloat(data?.lat),
    lon: parseFloat(data?.lon),
    raw: data,
  };
}

function formatSearch(list: any[]): GeoAddress[] {
  return list.map((item) => {
    const a = item?.address ?? {};
    const parts = [
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
      line: parts || item?.display_name || "",
      city: a?.city || a?.town || a?.village || a?.municipality || null,
      postcode: a?.postcode ?? null,
      country: a?.country ?? null,
      lat: parseFloat(item?.lat),
      lon: parseFloat(item?.lon),
      raw: item,
    };
  });
}

function mapServerError(json: any): { code: GeoErrorCode; message: string } {
  const code = (json?.code as GeoErrorCode) ?? "upstream_error";
  const defaultMsg: Record<GeoErrorCode, string> = {
    denied: "Permission de géolocalisation refusée.",
    unsupported: "Votre navigateur ne supporte pas la géolocalisation.",
    timeout: "La demande a expiré.",
    network: "Erreur réseau.",
    rate_limited: "Trop de requêtes. Réessayez plus tard.",
    forbidden: "Accès interdit par le service d'adressage.",
    upstream_error: "Le service d'adressage est indisponible.",
    bad_request: "Requête invalide.",
    internal: "Erreur interne.",
    missing_config: "VITE_PUBLIC_GEOCODE_URL n'est pas configuré.",
  };
  return {
    code,
    message: json?.message ?? defaultMsg[code] ?? "Erreur inconnue.",
  };
}

// ----------------------- HTTP vers Edge Function -----------------------

async function buildAuthHeaders(): Promise<HeadersInit> {
  // Si l'utilisateur est connecté, on privilégie son access_token (JWT).
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_ANON_KEY;

  // Les functions Supabase attendent généralement ces deux headers :
  // - Authorization: Bearer <token>
  // - apikey: <anon key>
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };
  if (SUPABASE_ANON_KEY) headers["apikey"] = SUPABASE_ANON_KEY;
  return headers;
}

async function callReverse(
  lat: number,
  lon: number,
  lang: string,
  signal?: AbortSignal
) {
  const headers = await buildAuthHeaders();
  const url = new URL(GEOCODER_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lang", lang);

  const resp = await fetch(url.toString(), { signal, headers });
  const json = await resp.json().catch(() => ({}));

  if (!resp.ok || json?.ok !== true) {
    // map 401/403 pour clarté:
    if (resp.status === 401 || resp.status === 403) {
      throw { code: "forbidden", message: "Accès non autorisé à la fonction." };
    }
    throw mapServerError(json);
  }
  return json.data;
}

async function callSearch(
  q: string,
  lang: string,
  limit: number,
  signal?: AbortSignal
) {
  const headers = await buildAuthHeaders();
  const url = new URL(GEOCODER_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("lang", lang);
  url.searchParams.set("limit", String(limit));

  const resp = await fetch(url.toString(), { signal, headers });
  const json = await resp.json().catch(() => ({}));

  if (!resp.ok || json?.ok !== true) {
    if (resp.status === 401 || resp.status === 403) {
      throw { code: "forbidden", message: "Accès non autorisé à la fonction." };
    }
    throw mapServerError(json);
  }
  return json.data as any[];
}

// ----------------------- Hook principal -----------------------

export function useGeoAddress(options: UseGeoAddressOptions = {}) {
  const {
    lang = DEFAULT_LANG,
    highAccuracy = false,
    timeoutMs = 8000,
    maximumAgeMs = 30000,
  } = options;

  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<{
    code: GeoErrorCode;
    message: string;
  } | null>(null);
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const abortRef = useRef<AbortController | null>(null);

  const setErr = useCallback((code: GeoErrorCode, message?: string) => {
    const messages: Record<GeoErrorCode, string> = {
      denied: "Permission de géolocalisation refusée.",
      unsupported: "Votre navigateur ne supporte pas la géolocalisation.",
      timeout: "La demande a expiré.",
      network: "Erreur réseau.",
      rate_limited: "Trop de requêtes. Réessayez plus tard.",
      forbidden: "Accès interdit par le service d'adressage.",
      upstream_error: "Le service d'adressage est indisponible.",
      bad_request: "Requête invalide.",
      internal: "Erreur interne.",
      missing_config: "VITE_PUBLIC_GEOCODE_URL n'est pas configuré.",
    };
    setStatus("error");
    setError({
      code,
      message: message ?? messages[code] ?? "Erreur inconnue.",
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setError(null);
    setAddress(null);
    setCoords(null);
  }, []);

  const reverse = useCallback(
    async (lat: number, lon: number): Promise<GeoAddress | null> => {
      if (!GEOCODER_URL) {
        setErr("missing_config");
        return null;
      }

      // cache
      const key = ckReverse(lat, lon, lang);
      const cached = readCache<GeoAddress>(key);
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
        const raw = await callReverse(lat, lon, lang, ctrl.signal);
        const formatted = formatReverse(raw);
        writeCache(key, formatted);
        setCoords({ lat, lon });
        setAddress(formatted);
        setStatus("success");
        return formatted;
      } catch (e: any) {
        if (e?.name === "AbortError") return null;
        const code = (e?.code as GeoErrorCode) ?? "internal";
        setErr(code, e?.message);
        return null;
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [lang, setErr]
  );

  const search = useCallback(
    async (query: string, limit = 5): Promise<GeoAddress[]> => {
      if (!GEOCODER_URL) {
        setErr("missing_config");
        return [];
      }
      const q = query.trim();
      if (!q) return [];

      // cache
      const key = ckSearch(q, lang, limit);
      const cached = readCache<GeoAddress[]>(key);
      if (cached) return cached;

      // abort précédent
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setStatus("loading");
      setError(null);

      try {
        const rawList = await callSearch(q, lang, limit, ctrl.signal);
        const list = formatSearch(rawList);
        writeCache(key, list);
        setStatus("success");
        return list;
      } catch (e: any) {
        if (e?.name === "AbortError") return [];
        const code = (e?.code as GeoErrorCode) ?? "internal";
        setErr(code, e?.message);
        return [];
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [lang, setErr]
  );

  const locate = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErr("unsupported");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverse(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setErr("denied");
        else if (err.code === err.TIMEOUT) setErr("timeout");
        else setErr("internal", err.message);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      }
    );
  }, [highAccuracy, maximumAgeMs, reverse, setErr, timeoutMs]);

  // Auto locate au mount UNIQUEMENT si la permission est déjà granted (sinon warning)
  useEffect(() => {
    if (!options.autoLocateOnMount) return;
    let cancelled = false;

    async function maybeAuto() {
      try {
        // Permissions API (peut throw sur certains navigateurs)
        // @ts-ignore
        if (navigator?.permissions?.query) {
          // @ts-ignore
          const res = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (!cancelled && res.state === "granted") {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            locate();
          }
        }
      } catch {
        // ignore; on ne force pas sans gesture
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    maybeAuto();
    return () => {
      cancelled = true;
    };
  }, [locate, options.autoLocateOnMount]);

  // ----------------------- Return (+ alias compat) -----------------------

  const city = useMemo(() => address?.city ?? null, [address]);
  const label = useMemo(() => address?.line ?? "", [address]);
  const message = useMemo(() => error?.message ?? "", [error]);

  return {
    status,
    error,
    address,
    coords,
    locate,
    reverse,
    search,
    reset,

    // Aliases pour compatibilité ascendante
    doLocate: locate,
    clearLocate: reset,
    city,
    label,
    message,
  };
}
