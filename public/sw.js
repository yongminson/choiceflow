// public/sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // 대표님 사이트 아이콘
      badge: '/icon.png',
      vibrate: [100, 50, 100], // 징~ 징~ 진동
      data: {
        url: data.url || 'https://choice.ymstudio.co.kr',
      },
    };
    
    // 알림 띄우기
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // 누르면 알림 닫기
  
  // 누르면 대표님 사이트로 바로 이동
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});