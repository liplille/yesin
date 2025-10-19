// src/components/GeoAddress.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

type Address = {
  line: string;
  raw?: any;
  lat: number;
  lon: number;
  city?: string | null;
  country?: string | null;
};

type Status =
  | "idle"
  | "prompt"
  | "loading"
  | "success"
  | "denied"
  | "unsupported"
  | "error";

const LS_KEY = "geoAddress.cache.v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

/** Convertit l'objet "address" de Nominatim en chaîne lisible */
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
  const base =
    parts.length > 0
      ? parts.join(", ")
      : [city, country].filter(Boolean).join(", ");

  return base || "Localisation indisponible";
}

/** Lire le cache */
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

/** Écrire en cache */
function writeCache(value: Address) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    // no-op
  }
}

const GeoAddress = forwardRef(
  (
    {
      onResolved,
      autoRequest = false,
      onStatusChange,
    }: {
      onResolved?: (payload: {
        city: string | null;
        country: string | null;
        addressLine: string;
        lat: number;
        lon: number;
      }) => void;
      autoRequest?: boolean;
      onStatusChange?: (status: Status) => void;
    },
    ref
  ) => {
    const [status, setStatus] = useState<Status>("idle");
    const [address, setAddress] = useState<Address | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const supported =
      typeof navigator !== "undefined" && "geolocation" in navigator;

    const updateStatus = useCallback(
      (newStatus: Status) => {
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      },
      [onStatusChange]
    );

    const doLocate = useCallback(() => {
      if (!supported) {
        updateStatus("unsupported");
        setMessage("Votre navigateur ne supporte pas la géolocalisation.");
        onResolved?.({
          city: null,
          country: null,
          addressLine: "",
          lat: NaN,
          lon: NaN,
        });
        return;
      }
      updateStatus("loading");
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
              headers: {
                "Accept-Language": navigator.language || "fr-FR",
              },
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

            const value: Address = {
              line,
              raw: data,
              lat,
              lon,
              city,
              country,
            };
            setAddress(value);
            writeCache(value);
            updateStatus("success");
            onResolved?.({
              city,
              country,
              addressLine: line,
              lat,
              lon,
            });
          } catch (err) {
            console.error(err);
            updateStatus("error");
            setMessage("Impossible de déterminer l’adresse.");
            onResolved?.({
              city: null,
              country: null,
              addressLine: "",
              lat: NaN,
              lon: NaN,
            });
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            updateStatus("denied");
            setMessage(
              "Permission refusée. Vous pouvez autoriser la localisation dans votre navigateur."
            );
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            updateStatus("error");
            setMessage("Position indisponible.");
          } else if (err.code === err.TIMEOUT) {
            updateStatus("error");
            setMessage("Délai dépassé lors de la localisation.");
          } else {
            updateStatus("error");
            setMessage("Erreur de géolocalisation.");
          }
          onResolved?.({
            city: null,
            country: null,
            addressLine: "",
            lat: NaN,
            lon: NaN,
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5 * 60 * 1000,
        }
      );
    }, [supported, onResolved, updateStatus]);

    const clearLocate = useCallback(() => {
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        // no-op
      }
      setAddress(null);
      updateStatus("idle");
      setMessage(null);
      onResolved?.({
        city: null,
        country: null,
        addressLine: "",
        lat: NaN,
        lon: NaN,
      });
    }, [onResolved, updateStatus]);

    useImperativeHandle(ref, () => ({
      doLocate,
      clearLocate,
    }));

    useEffect(() => {
      const cached = readCache();
      if (cached) {
        setAddress(cached);
        updateStatus("success");
        onResolved?.({
          city: cached.city ?? null,
          country: cached.country ?? null,
          addressLine: cached.line,
          lat: cached.lat,
          lon: cached.lon,
        });
      } else {
        updateStatus("prompt");
      }
    }, [onResolved, updateStatus]);

    useEffect(() => {
      if (!autoRequest) return;
      if (status !== "prompt") return;

      if (
        "permissions" in navigator &&
        typeof (navigator as any).permissions?.query === "function"
      ) {
        (navigator.permissions as any)
          .query({ name: "geolocation" as PermissionName })
          .then((p: any) => {
            if (p.state === "granted" || p.state === "prompt") {
              doLocate();
            }
          })
          .catch(() => {
            doLocate();
          });
      } else {
        doLocate();
      }
    }, [autoRequest, status, doLocate]);

    const label = useMemo(() => {
      if (status === "loading") return "Détermination de votre adresse…";
      if (status === "success" && address) return address.line;
      if (status === "denied") return "Localisation refusée";
      if (status === "unsupported") return "Géolocalisation non supportée";
      if (status === "error") return "Adresse indisponible";
      return "Partager ma position pour afficher l’adresse";
    }, [status, address]);

    const canShowUpdateButton = status === "success" && address;

    return (
      <div className="flex items-center gap-2 text-xs md:text-sm">
        <span className="opacity-80">Votre adresse :</span>

        {canShowUpdateButton ? (
          <div className="inline-flex items-center gap-2">
            <span className="font-medium">{label}</span>
            <button
              onClick={doLocate}
              className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10"
              title="Rafraîchir l’adresse"
            >
              Mettre à jour
            </button>
          </div>
        ) : status === "loading" ? (
          <span className="animate-pulse">{label}</span>
        ) : (
          <button
            onClick={doLocate}
            className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10"
            title="Autoriser la localisation"
          >
            {label}
          </button>
        )}

        {message && <span className="opacity-60">— {message}</span>}
      </div>
    );
  }
);

export default GeoAddress;
