self.addEventListener('push', function (event) {
  // 기본 알림 설정 (에러 방지용)
  let title = "ChoiceFlow";
  let options = {
    body: "새로운 알림이 도착했습니다.",
    vibrate: [100, 50, 100],
    data: { url: 'https://choice.ymstudio.co.kr' }
  };

  // 서버에서 보낸 데이터가 있으면 덮어쓰기
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      if (data.url) options.data.url = data.url;
    } catch (e) {
      options.body = event.data.text();
    }
  }

  // 화면에 알림 띄우기 (아이콘 없어도 작동하게 수정됨)
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});