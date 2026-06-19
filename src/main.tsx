import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Registrazione Service Worker ─────────────────────────────────────────────
// Il SW gestisce le notifiche push locali e (in futuro) il caching offline.
// Viene registrato solo in produzione-like (non in modalità dev con HMR attivo)
// per evitare problemi di cache durante lo sviluppo.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Registrato con scope:", registration.scope);
      })
      .catch((error) => {
        console.error("[SW] Registrazione fallita:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
