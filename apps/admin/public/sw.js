// One-release retirement worker for the old Workbox PWA cache.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter((name) =>
      name === 'start-url' || name.startsWith('workbox-precache-') || name.startsWith('workbox-runtime-'),
    );
    await Promise.all(oldCaches.map((name) => caches.delete(name)));
    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => {
      try {
        const url = new URL(client.url);
        const isLocalDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        return url.origin === self.location.origin && !isLocalDevelopment
          ? client.navigate(client.url).catch(() => null)
          : Promise.resolve(null);
      } catch {
        return Promise.resolve(null);
      }
    }));
  })());
});
