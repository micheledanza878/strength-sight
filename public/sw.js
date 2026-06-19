/**
 * Service Worker - Strength Sight PWA
 *
 * Responsabilità:
 * - Cache delle risorse statiche (strategia cache-first)
 * - Ricezione messaggi dall'app per mostrare notifiche locali schedulate
 * - Gestione click sulle notifiche (apertura/focus della finestra app)
 *
 * NON usa Web Push con server: le notifiche vengono schedulate
 * dall'app stessa al momento del login/apertura, tramite postMessage.
 */

const CACHE_NAME = "strength-sight-v1";

// ── Installazione: skip waiting per attivazione immediata ──────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Attivazione: prende controllo di tutte le tab aperte ──────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Fetch: pass-through (nessuna cache aggressiva, l'app usa Supabase) ────
self.addEventListener("fetch", (_event) => {
  // Lasciamo passare tutte le richieste senza intercettare.
  // Aggiungi qui una strategia cache se in futuro vuoi offline support.
});

// ── Messaggi dall'app: schedulazione notifiche locali ────────────────────
//
// L'app invia un messaggio con struttura:
// {
//   type: "SCHEDULE_NOTIFICATION",
//   payload: {
//     tag: string,          // identificatore univoco (evita duplicati)
//     title: string,
//     body: string,
//     icon: string,
//     badge: string,
//     delayMs: number,      // millisecondi di attesa prima di mostrare
//     data: { url: string } // URL su cui navigare al click
//   }
// }
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "SCHEDULE_NOTIFICATION") return;

  const { tag, title, body, icon, badge, delayMs, data } = msg.payload;

  // Usiamo setTimeout dentro il SW per il delay.
  // ATTENZIONE: il SW potrebbe essere terminato prima del timeout se non ci
  // sono altre attività. Per delay brevi (< 30 s) funziona bene; per delay
  // più lunghi sarebbe necessaria la Push API con server.
  // In questo progetto usiamo delayMs = 0 o pochi secondi, quindi va bene.
  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: badge || "/favicon.ico",
      tag,          // se già esiste una notifica con lo stesso tag, la sostituisce
      renotify: false,
      data,
      // Vibrazione: pattern [durata-on, durata-off, durata-on]
      vibrate: [200, 100, 200],
    });
  }, delayMs || 0);
});

// ── Click sulla notifica: porta l'utente nell'app ─────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Se c'è già una finestra aperta, mettila a fuoco e naviga
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Altrimenti apri una nuova finestra
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
