/* SideQuest service worker — receives web-push and opens the linked page. */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'SideQuest', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'SideQuest';
  const options = {
    body: payload.body || '',
    icon: '/icon-granite-512.png',
    badge: '/icon-granite-256.png',
    tag: payload.tag || undefined,
    vibrate: [12, 40, 12],
    data: { link: payload.link || '/notifications' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(link);
          return;
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
