/* Loaded by the generated Workbox service worker. No credentials are stored here. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Show a visible fallback. */ }
  const scope = new URL(self.registration.scope);
  let target = new URL('?tab=grades', scope);
  try {
    const candidate = new URL(payload.url || '', scope);
    if (candidate.origin === scope.origin && candidate.pathname.startsWith(scope.pathname)) target = candidate;
  } catch { /* Ignore invalid notification URLs. */ }
  event.waitUntil(self.registration.showNotification(String(payload.title || 'Дневник: новое уведомление'), {
    body: String(payload.body || 'Откройте приложение, чтобы посмотреть обновления.'),
    icon: new URL('pwa-192x192.png', scope).href,
    badge: new URL('pwa-192x192.png', scope).href,
    tag: String(payload.tag || 'dnevnik-update'),
    renotify: false,
    data: { url: target.href },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    const target = new URL(event.notification.data?.url || '?tab=grades', scope);
    if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const window of windows) if (window.url.startsWith(scope.href) && 'focus' in window) {
      await window.navigate(target.href); await window.focus(); return;
    }
    await self.clients.openWindow(target.href);
  })());
});
