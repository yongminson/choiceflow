self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch(e) {
    data = { title: 'ChoiceFlow', body: event.data.text() };
  }
  
  const title = data.title || 'ChoiceFlow';
  const options = {
    body: data.body || '새 알림이 도착했습니다.',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,  // ← 핵심: 안드로이드에서 알림 유지
    data: { url: data.url || 'https://choice.ymstudio.co.kr' },
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://choice.ymstudio.co.kr';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});