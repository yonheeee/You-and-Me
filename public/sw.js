// public/sw.js
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  const title = data.title || '알림';
  const body  = data.body  || '';
  const url   = data.url   || '/';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
