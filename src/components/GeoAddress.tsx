// src/components/GeoAddress.tsx
import type { GeoStatus } from "../hooks/useGeoAddress"; // <-- GeoStatus ici
export default function GeoAddress({
  status,
  label,
  message,
  onLocate,
  onRefresh,
}: {
  status: GeoStatus;
  label: string;
  message?: string | null;
  onLocate: () => void;
  onRefresh: () => void;
}) {
  const canShowUpdateButton = status === "success";

  return (
    // min-w-0 permet au contenu de rétrécir
    <div className="flex items-center gap-2 text-xs md:text-sm min-w-0">
      <span className="opacity-80 flex-shrink-0">Votre adresse :</span>{" "}
      {canShowUpdateButton ? (
        // min-w-0 permet au span intérieur d'être tronqué
        <div className="inline-flex items-center gap-2 min-w-0">
          {/* Ajout des classes max-w-* pour limiter la largeur + troncature */}
          <span
            className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md" // Limites de largeur ajoutées (ajustez si besoin)
            title={label} // Pour voir l'adresse complète au survol
          >
            {label}
          </span>
          <button
            onClick={onRefresh}
            // flex-shrink-0 empêche le bouton d'être écrasé
            className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10 flex-shrink-0"
            title="Rafraîchir l’adresse"
          >
            Mettre à jour
          </button>
        </div>
      ) : status === "loading" ? (
        <span className="animate-pulse">{label}</span>
      ) : (
        <button
          onClick={onLocate}
          className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10"
          title="Autoriser la localisation"
        >
          {label}{" "}
          {/* Ce label peut aussi devenir très long, envisagez max-w ici aussi si nécessaire */}
        </button>
      )}
      {message && (
        <span className="opacity-60 whitespace-nowrap overflow-hidden text-ellipsis">
          — {message}
        </span>
      )}
    </div>
  );
}
