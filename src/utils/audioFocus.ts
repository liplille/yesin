// src/utils/audioFocus.ts
export type AudioOwner = "creator" | "radio" | "playlist" | "recorder";

/** Demande le focus audio et notifie les autres acteurs de se mettre en pause/stop. */
export function requestAudioFocus(owner: AudioOwner) {
  window.dispatchEvent(new CustomEvent("audio:focus", { detail: { owner } }));
}

/** S'abonne aux changements de focus. Retourne une fonction de cleanup. */
export function onAudioFocus(owner: AudioOwner, onLoseFocus: () => void) {
  const handler = (e: Event) => {
    const other = (e as CustomEvent).detail?.owner as AudioOwner | undefined;
    if (other && other !== owner) onLoseFocus();
  };
  window.addEventListener("audio:focus", handler as EventListener);
  return () =>
    window.removeEventListener("audio:focus", handler as EventListener);
}
