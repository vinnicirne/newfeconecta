'use client';

import { useEffect } from 'react';

const CACHE_VERSION_KEY = 'feconecta:pwa-cache-version';
const CACHE_VERSION = 'feed-carousel-modular-20261120-v1';
const LEGACY_WORKER_PATHS = new Set(['/sw.js', '/service-worker.js']);

export function LegacyPwaCacheReset() {
  useEffect(() => {
    let storedVersion: string | null = null;
    try {
      storedVersion = window.localStorage.getItem(CACHE_VERSION_KEY);
    } catch {
      // Keep loading if browser storage is unavailable.
    }
    if (storedVersion === CACHE_VERSION) return;

    void (async () => {
      let changed = false;

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const workers = [registration.active, registration.waiting, registration.installing].filter(Boolean);
          const isLegacyFeedWorker = workers.some((worker) => {
            try {
              const script = new URL(worker!.scriptURL);
              return script.origin === window.location.origin && LEGACY_WORKER_PATHS.has(script.pathname);
            } catch {
              return false;
            }
          });

          if (isLegacyFeedWorker) changed = (await registration.unregister()) || changed;
        }
      }

      if ('caches' in window) {
        const appCacheNames = (await window.caches.keys()).filter((name) =>
          name === 'start-url' || name.startsWith('workbox-precache-') || name.startsWith('workbox-runtime-'),
        );
        const deleted = await Promise.all(appCacheNames.map((name) => window.caches.delete(name)));
        changed = deleted.some(Boolean) || changed;
      }

      let canRememberVersion = false;
      try {
        window.localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
        canRememberVersion = true;
      } catch {
        // Avoid a reload loop when storage is disabled.
      }

      if (changed && canRememberVersion) window.location.reload();
    })().catch(() => undefined);
  }, []);

  return null;
}
