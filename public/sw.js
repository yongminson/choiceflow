self.addEventListener('push', function (event) {
    if (event.data) {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon.png', // 우리 사이트 로고 아이콘
        badge: '/icon.png',
        vibrate: [100, 50, 100], // 핸드폰 진동 패턴 (징~ 징~)
        data: {
          url: data.url || 'https://choice.ymstudio.co.kr',
        },
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    }
  });
  
  self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // 알림 클릭하면 닫히게
    // 알림을 클릭하면 해당 주소로 사이트 열기
    event.waitUntil(clients.openWindow(event.notification.data.url));
  });