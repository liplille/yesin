// src/lib/analytics.ts
type GAParams = Record<string, any>;
type MetaParams = Record<string, any>;

// Augmente l'interface Window pour inclure gtag, fbq et notre flag de session
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    // Utilise un Set pour stocker les clés des événements déjà tracés dans cette session d'onglet
    __analyticsFlags?: Set<string>;
  }
}

// --- AJOUT : Flag de debug ---
// Active les logs console si en dev ET si localStorage.__debug_analytics est défini (ex: localStorage.setItem('__debug_analytics', '1'))
const DEBUG_ANALYTICS =
  import.meta.env.DEV &&
  typeof localStorage !== "undefined" &&
  !!localStorage.getItem("__debug_analytics");

if (DEBUG_ANALYTICS) {
  console.log(
    "[Analytics] Debug logs activés via localStorage.__debug_analytics."
  );
}
// --- FIN AJOUT ---

/**
 * Vérifie si une clé a déjà été marquée pour cette session d'onglet.
 * Si non, la marque et retourne true. Sinon, retourne false.
 */
function safeOnce(key: string): boolean {
  if (typeof window === "undefined") return false; // Ne rien faire côté serveur ou si window n'existe pas
  if (!window.__analyticsFlags) {
    window.__analyticsFlags = new Set();
  }
  if (window.__analyticsFlags.has(key)) {
    return false; // Déjà tracé
  }
  window.__analyticsFlags.add(key); // Marquer comme tracé
  return true;
}

/**
 * Envoie un événement page_view à GA4 et Meta Pixel.
 */
export function trackPageView(
  path: string,
  title?: string,
  params: GAParams = {}
) {
  if (typeof window === "undefined") return; // Vérification window

  const pageLocation = window.location.href; // URL complète actuelle
  const pageTitle = title ?? document.title; // Titre de la page

  // --- GA4 PageView ---
  try {
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_title: pageTitle,
        page_location: pageLocation,
        page_path: path, // Chemin relatif (ex: /create-pitch?param=1)
        ...params,
      });
      if (DEBUG_ANALYTICS)
        console.debug(`[Analytics] GA PageView: ${path}`, {
          page_title: pageTitle,
          page_location: pageLocation,
          ...params,
        });
    } else if (DEBUG_ANALYTICS) {
      console.warn("[Analytics] window.gtag non trouvé pour PageView.");
    }
  } catch (error) {
    console.error("[Analytics] Erreur GA PageView:", error);
  }

  // --- Meta Pixel PageView ---
  try {
    if (window.fbq) {
      window.fbq("track", "PageView");
      if (DEBUG_ANALYTICS) console.debug(`[Analytics] Meta PageView`);
    } else if (DEBUG_ANALYTICS) {
      console.warn("[Analytics] window.fbq non trouvé pour PageView.");
    }
  } catch (error) {
    console.error("[Analytics] Erreur Meta PageView:", error);
  }
}

/**
 * Envoie un événement personnalisé à GA4 et Meta Pixel.
 */
export function trackEvent(
  name: string,
  gaParams: GAParams = {},
  metaName?: string, // Nom standard Meta optionnel
  metaParams: MetaParams = {}
) {
  if (typeof window === "undefined") return; // Vérification window

  // --- GA4 Event ---
  try {
    if (window.gtag) {
      window.gtag("event", name, gaParams);
      if (DEBUG_ANALYTICS)
        console.debug(`[Analytics] GA Event: ${name}`, gaParams);
    } else if (DEBUG_ANALYTICS) {
      console.warn(`[Analytics] window.gtag non trouvé pour Event: ${name}.`);
    }
  } catch (error) {
    console.error(`[Analytics] Erreur GA Event (${name}):`, error);
  }

  // --- Meta Pixel Event ---
  try {
    if (window.fbq) {
      if (metaName) {
        // Événement standard Meta
        window.fbq("track", metaName, metaParams);
        if (DEBUG_ANALYTICS)
          console.debug(
            `[Analytics] Meta Standard Event: ${metaName}`,
            metaParams
          );
      } else {
        // Événement custom Meta (utilise le nom GA4 par défaut)
        window.fbq("trackCustom", name, metaParams);
        if (DEBUG_ANALYTICS)
          console.debug(`[Analytics] Meta Custom Event: ${name}`, metaParams);
      }
    } else if (DEBUG_ANALYTICS) {
      console.warn(
        `[Analytics] window.fbq non trouvé pour Event: ${metaName || name}.`
      );
    }
  } catch (error) {
    console.error(
      `[Analytics] Erreur Meta Event (${metaName || name}):`,
      error
    );
  }
}

/**
 * Déclenche un événement une seule fois par session d'onglet.
 */
export function trackEventOnce(
  sessionKey: string, // La clé doit maintenant être fournie complète par l'appelant
  name: string,
  gaParams: GAParams = {},
  metaName?: string,
  metaParams: MetaParams = {}
) {
  if (safeOnce(sessionKey)) {
    trackEvent(name, gaParams, metaName, metaParams);
  } else {
    if (DEBUG_ANALYTICS)
      console.debug(
        `[Analytics] EventOnce: ${name} (déjà tracé pour la clé ${sessionKey})`
      );
  }
}

/**
 * Détermine si un chemin doit être tracé comme une page_view.
 * Exclut les callbacks, certaines pages si auth, et /create-pitch?new=1.
 */
export function shouldTrackPath(
  pathname: string,
  isAuthenticated: boolean
): boolean {
  // Récupère les query params actuels (nécessaire pour la condition /create-pitch?new=1)
  const currentSearch =
    typeof window !== "undefined" ? window.location.search : "";

  // Exclusions techniques générales
  const excludedPaths = ["/auth/callback"];
  if (excludedPaths.some((p) => pathname.startsWith(p))) {
    if (DEBUG_ANALYTICS)
      console.debug(
        `[Analytics] Path ${pathname} ignoré (exclusion technique).`
      );
    return false;
  }

  // --- AJOUT CORRECTION : Ignorer /create-pitch?new=1 ---
  // Ignore la page view initiale qui contient ce paramètre car elle sera
  // immédiatement suivie d'une autre page view après nettoyage de l'URL.
  if (
    pathname === "/create-pitch" &&
    new URLSearchParams(currentSearch).has("new")
  ) {
    if (DEBUG_ANALYTICS)
      console.debug(
        `[Analytics] Path ${pathname}?new=... ignoré (sera retracé après nettoyage URL).`
      );
    return false;
  }
  // --- FIN AJOUT CORRECTION ---

  // Exclusions si l'utilisateur est authentifié
  if (isAuthenticated) {
    const excludedWhenAuthenticated = ["/welcome"];
    if (excludedWhenAuthenticated.some((p) => pathname.startsWith(p))) {
      if (DEBUG_ANALYTICS)
        console.debug(
          `[Analytics] Path ${pathname} ignoré (utilisateur authentifié).`
        );
      return false;
    }
  }

  // Si aucune règle d'exclusion ne s'applique
  return true;
}

/** Noms d'événements standardisés */
export const Events = {
  SIGN_UP_START: "sign_up_start",
  SIGN_UP_COMPLETE: "sign_up",
  LOGIN: "login",
  RECORDING_START: "recording_start",
  PITCH_SUBMIT_SUCCESS: "pitch_submit_success",
  EXIT_INTENT_SHOWN: "exit_intent_shown",
  EXIT_INTENT_CLOSED: "exit_intent_closed",
  EXIT_INTENT_CTA_CLICK: "exit_intent_cta_click",
} as const;

/** Fonctions d'émission spécifiques */
export const emit = {
  signUpStart: (method: "email" | "google", context: GAParams = {}) => {
    trackEvent(Events.SIGN_UP_START, { method, ...context }, undefined, {
      method,
      ...context,
    });
  },
  signUpComplete: (
    method: "magic_link" | "google" | string,
    context: GAParams = {}
  ) => {
    trackEvent(
      Events.SIGN_UP_COMPLETE,
      { method, ...context },
      "CompleteRegistration",
      { method, ...context }
    );
  },
  login: (method: "magic_link" | "google" | string, context: GAParams = {}) => {
    trackEvent(Events.LOGIN, { method, ...context }, undefined, {
      method,
      ...context,
    });
  },
  // La clé de session est construite ici
  recordingStartOnce: (context: GAParams = {}) => {
    const sessionKey = `${Events.RECORDING_START}:${
      context.recorder_type || context.page || "default"
    }`;
    trackEventOnce(
      sessionKey,
      Events.RECORDING_START,
      context,
      undefined,
      context
    );
  },
  pitchSubmitSuccess: (context: GAParams = {}) => {
    trackEvent(Events.PITCH_SUBMIT_SUCCESS, context, "Lead", context);
  },
  exitIntentShown: (context: GAParams = {}) => {
    trackEvent(Events.EXIT_INTENT_SHOWN, context, undefined, context);
  },
  exitIntentClosed: (reason: string, context: GAParams = {}) => {
    trackEvent(Events.EXIT_INTENT_CLOSED, { reason, ...context }, undefined, {
      reason,
      ...context,
    });
  },
  // Note: L'appel principal pour ce CTA (avec callback) se fait directement dans ExitIntentModal
  // Cet appel via 'emit' reste ici comme fallback ou pour d'autres usages potentiels.
  exitIntentCTAClick: (cta_label: string, context: GAParams = {}) => {
    trackEvent(
      Events.EXIT_INTENT_CTA_CLICK,
      { cta_label, ...context },
      undefined,
      { cta_label, ...context }
    );
  },
};
