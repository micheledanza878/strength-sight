/**
 * use-notifications.ts
 *
 * Hook React per gestire il permesso notifiche e la preferenza utente.
 *
 * Espone:
 * - `permission`: stato corrente del permesso ("granted" | "denied" | "default" | "unsupported")
 * - `isEnabled`: true se l'utente ha attivato le notifiche E il permesso è concesso
 * - `isSupported`: true se il browser supporta le notifiche
 * - `toggle()`: funzione per abilitare/disabilitare le notifiche (richiede permesso se necessario)
 */

import { useState, useEffect, useCallback } from "react";
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
} from "@/lib/notifications";

interface UseNotificationsReturn {
  permission: NotificationPermission | "unsupported";
  isEnabled: boolean;
  isSupported: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => getNotificationPermission()
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(
    () => areNotificationsEnabled() && getNotificationPermission() === "granted"
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizza lo stato se il permesso cambia esternamente
  // (es. l'utente lo revoca dalle impostazioni del browser)
  useEffect(() => {
    if (!areNotificationsSupported()) return;

    // Polling leggero: la Permissions API non ha eventi standard su tutti i browser
    const interval = setInterval(() => {
      const current = getNotificationPermission();
      setPermission((prev) => {
        if (prev !== current) {
          // Se il permesso è stato revocato, disabilitiamo anche la preferenza
          if (current !== "granted") {
            setNotificationsEnabled(false);
            setIsEnabled(false);
          }
          return current;
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * toggle():
   * - Se le notifiche sono disabilitate → richiede permesso (se necessario) e le abilita
   * - Se le notifiche sono abilitate → le disabilita (senza revocare il permesso del browser,
   *   perché non è possibile farlo programmaticamente; l'utente deve farlo dalle impostazioni)
   */
  const toggle = useCallback(async () => {
    if (!areNotificationsSupported()) return;

    setIsLoading(true);
    try {
      if (isEnabled) {
        // Disabilita: salva preferenza, non mostrare più notifiche
        setNotificationsEnabled(false);
        setIsEnabled(false);
      } else {
        // Abilita: richiedi permesso se non ancora concesso
        const result = await requestNotificationPermission();
        setPermission(result);

        if (result === "granted") {
          setNotificationsEnabled(true);
          setIsEnabled(true);
        }
        // Se "denied" o "default" (l'utente ha chiuso il popup), non abilitiamo
      }
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  return {
    permission,
    isEnabled,
    isSupported: areNotificationsSupported(),
    isLoading,
    toggle,
  };
}
