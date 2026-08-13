# ChoiceFlow Android

현재 Vercel 웹 앱을 Capacitor Android 컨테이너에서 실행합니다. 추천 및 제휴 API의 비밀키는 Android 앱에 넣지 않고 Vercel 서버에만 둡니다.

## 개발

```powershell
npm install
npm run assets
npm run sync
npm run open
```

Android Studio에서 실제 기기로 위치 권한, 로그인, 뒤로가기, 쿠팡 외부 링크, 오프라인 상태를 확인하세요.

## 출시 전 필수

- `appId`는 Play Console 앱 생성 전에 최종 확정합니다. 한번 출시한 패키지명은 변경할 수 없습니다.
- `android/app/src/main/res/mipmap-*`의 임시 아이콘을 최종 아이콘으로 교체합니다.
- 서명 키를 안전한 별도 위치에 생성하고 Git에 커밋하지 않습니다.
- 디지털 크레딧 판매는 Google Play Billing 구현 전까지 앱에서 제공하지 않습니다.
- `bundleRelease` 전에 버전 코드와 버전 이름을 올리고 Play Console의 내부 테스트 트랙에서 검증합니다.

`server.url`은 운영 웹에 의존합니다. 운영 웹 장애 시 앱도 사용할 수 없으므로 스토어 제출 전 오프라인/점검 화면을 네이티브 수준에서 추가하는 작업이 남아 있습니다.
