import type { Status } from "../hooks/useGeoAddress";

export default function GeoAddress({
  status,
  label,
  message,
  onLocate,
  onRefresh,
}: {
  status: Status;
  label: string;
  message?: string | null;
  onLocate: () => void;
  onRefresh: () => void;
}) {
  const canShowUpdateButton = status === "success";

  return (
    <div className="flex items-center gap-2 text-xs md:text-sm">
      <span className="opacity-80">Votre adresse :</span>

      {canShowUpdateButton ? (
        <div className="inline-flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <button
            onClick={onRefresh}
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
          onClick={onLocate}
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
