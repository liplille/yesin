// src/components/GeoAddress.tsx
import { MapPinIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import type { GeoStatus, GeoErrorCode } from "../hooks/useGeoAddress"; // Importer GeoErrorCode aussi

export default function GeoAddress({
  status,
  label,
  message,
  onLocate,
  onRefresh,
  // Ajout de l'erreur brute pour différencier 'denied' de 'error' général
  error,
}: {
  status: GeoStatus; // Maintenant 'idle' | 'locating' | 'loading' | 'success' | 'error'
  label: string;
  message?: string | null;
  onLocate: () => void;
  onRefresh: () => void;
  // Passer l'objet erreur complet du hook useGeoAddress
  error: { code: GeoErrorCode; message: string } | null; // Utiliser GeoErrorCode
}) {
  const isLocated = status === "success";
  const isLoading = status === "loading" || status === "locating";
  // On se base sur error.code pour savoir si c'est 'denied'
  const isDenied = error?.code === "denied";
  // isError est vrai si le statut est 'error' MAIS que le code n'est PAS 'denied'
  const isError = status === "error" && !isDenied;

  return (
    // Le conteneur principal reste flex pour aligner l'icône et le reste
    <div className="flex items-center gap-2 text-xs md:text-sm min-w-0">
      {/* === Icône (toujours affichée, change selon le statut) === */}
      <div className="flex-shrink-0">
        {" "}
        {/* Empêche l'icône d'être écrasée */}
        {isLoading ? (
          <ArrowPathIcon
            className="h-4 w-4 text-yellow-500 animate-spin"
            title="Localisation en cours..."
          />
        ) : isDenied || isError ? ( // Regroupe denied et error pour l'icône rouge
          <ArrowPathIcon
            className="h-4 w-4 text-red-500"
            title={isDenied ? "Localisation refusée" : "Erreur de localisation"}
          />
        ) : isLocated ? (
          <MapPinIcon className="h-4 w-4 text-green-500" title="Localisé" />
        ) : (
          // Cas idle ou unsupported
          <MapPinIcon
            className="h-4 w-4 text-gray-400"
            title="Localisation inactive"
          />
        )}
      </div>

      {/* === Contenu (Texte adresse, Bouton Mettre à jour, Bouton Activer/Réessayer, Message d'erreur) === */}
      <div className="min-w-0">
        {" "}
        {/* Permet au contenu de gérer son propre overflow */}
        {isLocated ? (
          <div className="inline-flex items-center gap-2">
            {" "}
            {/* Garder le bouton "Mettre à jour" à côté */}
            <span
              className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md"
              title={label}
            >
              {label}
            </span>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10 flex-shrink-0"
              title="Rafraîchir l’adresse"
            >
              Mettre à jour
            </button>
          </div>
        ) : isLoading ? (
          <span className="opacity-70">Recherche en cours...</span>
        ) : (
          // Bouton pour activer/réessayer (maintenant sans icône interne)
          <button
            onClick={onLocate}
            className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-white/5 dark:border-white/10"
            // Le title peut utiliser le message d'erreur directement
            title={
              message ||
              (isDenied || isError
                ? "Réessayer la localisation"
                : "Activer la localisation")
            }
          >
            {/* Texte conditionnel basé sur isDenied ou isError */}
            {isDenied || isError
              ? "Réessayer la localisation"
              : "Activer la localisation"}
          </button>
        )}
        {/* Affichage du message d'erreur (si pertinent) */}
        {/* S'assure que le message est affiché seulement si c'est une erreur ou un refus */}
        {message && (isError || isDenied) && (
          <span className="ml-1 opacity-60 whitespace-nowrap overflow-hidden text-ellipsis">
            — {message}
          </span>
        )}
      </div>
    </div>
  );
}
