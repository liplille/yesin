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
  // --- AJOUT : Vérification window ---
  if (typeof window === "undefined") return false;
  // --- FIN AJOUT ---
  if (!window.__analyticsFlags) {
    window.__analyticsFlags = new Set();
  }
  if (window.__analyticsFlags.has(key)) {
    return false;
  }
  window.__analyticsFlags.add(key);
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
  // --- AJOUT : Vérification window ---
  if (typeof window === "undefined") return;
  // --- FIN AJOUT ---

  const pageLocation = window.location.href;
  const pageTitle = title ?? document.title;

  // --- GA4 PageView ---
  try {
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_title: pageTitle,
        page_location: pageLocation,
        page_path: path,
        ...params,
      });
      // --- Log conditionnel ---
      if (DEBUG_ANALYTICS)
        console.debug(`[Analytics] GA PageView: ${path}`, {
          page_title: pageTitle,
          page_location: pageLocation,
          ...params,
        });
      // --- Fin Log ---
    } else if (DEBUG_ANALYTICS) {
      // Log warning seulement si debug activé
      console.warn("[Analytics] window.gtag non trouvé pour PageView.");
    }
  } catch (error) {
    console.error("[Analytics] Erreur GA PageView:", error);
  }

  // --- Meta Pixel PageView ---
  try {
    if (window.fbq) {
      window.fbq("track", "PageView");
      // --- Log conditionnel ---
      if (DEBUG_ANALYTICS) console.debug(`[Analytics] Meta PageView`);
      // --- Fin Log ---
    } else if (DEBUG_ANALYTICS) {
      // Log warning seulement si debug activé
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
  metaName?: string,
  metaParams: MetaParams = {}
) {
  // --- AJOUT : Vérification window ---
  if (typeof window === "undefined") return;
  // --- FIN AJOUT ---

  // --- GA4 Event ---
  try {
    if (window.gtag) {
      window.gtag("event", name, gaParams);
      // --- Log conditionnel ---
      if (DEBUG_ANALYTICS)
        console.debug(`[Analytics] GA Event: ${name}`, gaParams);
      // --- Fin Log ---
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
        window.fbq("track", metaName, metaParams);
        // --- Log conditionnel ---
        if (DEBUG_ANALYTICS)
          console.debug(
            `[Analytics] Meta Standard Event: ${metaName}`,
            metaParams
          );
        // --- Fin Log ---
      } else {
        window.fbq("trackCustom", name, metaParams);
        // --- Log conditionnel ---
        if (DEBUG_ANALYTICS)
          console.debug(`[Analytics] Meta Custom Event: ${name}`, metaParams);
        // --- Fin Log ---
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
 * La clé de session doit être unique et fournie par l'appelant.
 */
export function trackEventOnce(
  sessionKey: string, // La clé complète est attendue (ex: 'recording_start:demo')
  name: string,
  gaParams: GAParams = {},
  metaName?: string,
  metaParams: MetaParams = {}
) {
  if (safeOnce(sessionKey)) {
    trackEvent(name, gaParams, metaName, metaParams);
  } else {
    // --- Log conditionnel ---
    if (DEBUG_ANALYTICS)
      console.debug(
        `[Analytics] EventOnce: ${name} (déjà tracé pour la clé ${sessionKey})`
      );
    // --- Fin Log ---
  }
}

/**
 * Détermine si un chemin doit être tracé comme une page_view.
 */
export function shouldTrackPath(
  pathname: string,
  isAuthenticated: boolean
): boolean {
  const excludedPaths = ["/auth/callback"];
  if (excludedPaths.some((p) => pathname.startsWith(p))) {
    if (DEBUG_ANALYTICS)
      console.debug(
        `[Analytics] Path ${pathname} ignoré (exclusion technique).`
      );
    return false;
  }

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
  // ✅ La clé de session est construite ici avant d'appeler trackEventOnce
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
  exitIntentCTAClick: (cta_label: string, context: GAParams = {}) => {
    // Note : l'appel direct à gtag/fbq pour le callback est dans ExitIntentModal.tsx
    // Cet appel ici reste utile si on veut tracer SANS callback (ex: clic droit, autre action)
    // ou si on retire la logique de callback plus tard.
    trackEvent(
      Events.EXIT_INTENT_CTA_CLICK,
      { cta_label, ...context },
      undefined,
      { cta_label, ...context }
    );
  },
};

// --- Pour le Debug en développement (Confirmé) ---
if (import.meta.env.DEV) {
  // Le message est déjà affiché au début si DEBUG_ANALYTICS est vrai.
  // console.log('[Analytics] Mode développement actif.');
}
