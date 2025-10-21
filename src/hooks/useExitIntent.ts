// src/hooks/useExitIntent.ts
import { useEffect, useRef, useState } from "react";

type Options = {
  sessionKey?: string;
  delay?: number;
  topBoundary?: number;
  mobileVisibility?: boolean;
  /** NEW: activer/désactiver complètement le hook */
  enabled?: boolean;
};

export function useExitIntent({
  sessionKey = "exit-intent:getstarted:dismissed",
  delay = 80,
  topBoundary = 8,
  mobileVisibility = true,
  enabled = true, // NEW
}: Options = {}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const optOutNextNavRef = useRef(false);

  // Fermer si on désactive à chaud
  useEffect(() => {
    if (!enabled && open) setOpen(false);
  }, [enabled, open]);

  useEffect(() => {
    if (!enabled) return; // NEW: ne rien monter si désactivé

    if (sessionStorage.getItem(sessionKey) === "1") return;

    const onMouseOut = (e: MouseEvent) => {
      if ((e as any).relatedTarget || (e as any).toElement) return;
      if (e.clientY <= topBoundary) {
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          if (!optOutNextNavRef.current) setOpen(true);
        }, delay) as unknown as number;
      }
    };

    const onAnyClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest("a, button, [role='button']");
      if (!el) return;
      optOutNextNavRef.current = true;
      setTimeout(() => (optOutNextNavRef.current = false), 200);
    };

    const onVisibility = () => {
      if (!mobileVisibility) return;
      if (document.visibilityState === "hidden") {
        if (sessionStorage.getItem(sessionKey) === "1") return;
        setOpen(true);
      }
    };

    window.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", onAnyClick, { capture: true });
    if (mobileVisibility)
      document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("click", onAnyClick, {
        capture: true,
      } as any);
      if (mobileVisibility)
        document.removeEventListener("visibilitychange", onVisibility);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enabled, delay, topBoundary, sessionKey, mobileVisibility]);

  const dismiss = () => {
    sessionStorage.setItem(sessionKey, "1");
    setOpen(false);
  };

  return { open, setOpen, dismiss };
}
