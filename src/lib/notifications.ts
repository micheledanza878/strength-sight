/**
 * notifications.ts
 *
 * Libreria per la gestione delle notifiche locali PWA.
 *
 * Approccio scelto: notifiche locali schedulate via Service Worker.
 * - Non richiede backend né VAPID keys.
 * - Funziona in modalità standalone (PWA installata) e nel browser.
 * - Il SW riceve un messaggio con { type: "SCHEDULE_NOTIFICATION", payload }
 *   e chiama self.registration.showNotification() dopo un eventuale delay.
 *
 * Limitazione nota: se il delay è molto lungo (ore) e il SW viene terminato
 * dal browser, la notifica non arriva. Per delay brevi (all'apertura dell'app)
 * il comportamento è affidabile.
 */

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  tag: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  delayMs?: number;
  data?: { url: string };
}

// ─── Stato permesso ──────────────────────────────────────────────────────────

/** Restituisce true se le notifiche sono supportate dal browser. */
export function areNotificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

/** Restituisce lo stato attuale del permesso notifiche. */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!areNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Richiede il permesso per mostrare notifiche.
 * Restituisce il nuovo stato del permesso.
 * Chiama questa funzione solo in risposta a un gesto utente (click su bottone).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Invia un messaggio al Service Worker per schedulare una notifica.
 * Se il SW non è disponibile, usa la Notification API diretta (senza delay).
 */
async function scheduleViaServiceWorker(payload: NotificationPayload): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: "SCHEDULE_NOTIFICATION",
    payload,
  });
}

/**
 * Fallback: mostra notifica immediatamente con la Notification API classica.
 * Usato solo se il SW non è disponibile.
 */
function showDirectNotification(payload: NotificationPayload): void {
  if (Notification.permission !== "granted") return;
  new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon || "/favicon.ico",
    tag: payload.tag,
  });
}

/**
 * Mostra (o schedula) una notifica.
 * Usa il SW se disponibile, altrimenti fallback diretto.
 */
export async function scheduleNotification(payload: NotificationPayload): Promise<void> {
  if (!areNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      await scheduleViaServiceWorker(payload);
      return;
    } catch {
      // SW non disponibile, fallback
    }
  }

  showDirectNotification(payload);
}

// ─── Notifiche specifiche dell'app ───────────────────────────────────────────

/**
 * NOTIFICA 1: Streak in pericolo.
 *
 * Condizione: l'utente ha uno streak > 0 ma NON ha ancora allenato oggi.
 * La notifica ricorda di non spezzare la serie.
 *
 * @param streak - numero di giorni di streak attuale
 * @param hasWorkedOutToday - true se l'utente ha già completato un allenamento oggi
 */
export async function maybeNotifyStreakAtRisk(
  streak: number,
  hasWorkedOutToday: boolean
): Promise<void> {
  // Nessuna notifica se: streak è 0, o ha già allenato oggi
  if (streak === 0 || hasWorkedOutToday) return;

  // Evitiamo di mostrare più volte nella stessa giornata usando localStorage
  const storageKey = "notif_streak_shown_date";
  const todayStr = new Date().toISOString().slice(0, 10); // "2024-01-15"
  if (localStorage.getItem(storageKey) === todayStr) return;

  await scheduleNotification({
    tag: "streak-at-risk",
    title: `🔥 Streak a rischio! (${streak} ${streak === 1 ? "giorno" : "giorni"})`,
    body: "Non hai ancora allenato oggi. Mantieni la serie e non fermarti ora!",
    icon: "/favicon.ico",
    delayMs: 0,
    data: { url: "/" },
  });

  localStorage.setItem(storageKey, todayStr);
}

/**
 * NOTIFICA 2: Ultima misurazione corporea troppo vecchia.
 *
 * Condizione: l'utente non si misura da più di N giorni (default 14).
 * La soglia è configurabile per adattarsi alla frequenza di misurazione dell'utente.
 *
 * @param lastMeasurementDaysAgo - giorni dall'ultima misurazione (null = mai misurato)
 * @param thresholdDays - soglia in giorni oltre la quale notificare (default 14)
 */
export async function maybeNotifyMeasurementOverdue(
  lastMeasurementDaysAgo: number | null,
  thresholdDays = 14
): Promise<void> {
  // null = mai misurato → notifica subito
  const days = lastMeasurementDaysAgo ?? Infinity;
  if (days < thresholdDays) return;

  const storageKey = "notif_measurement_shown_date";
  const todayStr = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(storageKey) === todayStr) return;

  const bodyText =
    lastMeasurementDaysAgo === null
      ? "Non hai ancora registrato misurazioni corporee. Inizia a tracciare i tuoi progressi!"
      : `Ultima misurazione ${lastMeasurementDaysAgo} ${lastMeasurementDaysAgo === 1 ? "giorno" : "giorni"} fa. È ora di aggiornarla!`;

  await scheduleNotification({
    tag: "measurement-overdue",
    title: "📏 Registra le tue misurazioni",
    body: bodyText,
    icon: "/favicon.ico",
    // Leggero delay per non sovrapporsi alla notifica streak (se entrambe scattano)
    delayMs: 3000,
    data: { url: "/body-tracking" },
  });

  localStorage.setItem(storageKey, todayStr);
}

// ─── Preferenze utente ───────────────────────────────────────────────────────

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";

/** Legge la preferenza utente (abilitato/disabilitato). */
export function areNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";
}

/** Salva la preferenza utente. */
export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
}
