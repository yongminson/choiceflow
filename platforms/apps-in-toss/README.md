# ChoiceFlow 앱인토스 셸

공식 `@apps-in-toss/web-framework`로 패키징되는 WebView 셸입니다. 실제 추천과 서버 API는 기존 Vercel 서비스를 사용하며 비밀키를 번들에 포함하지 않습니다.

## 실행

```powershell
npm install
npm run dev
npm run build
npm run build:ait
```

## 콘솔 등록 후 바꿀 값

1. SDK 3가 사용하는 `apps-in-toss.config.ts`의 `appName`을 콘솔 값과 동일하게 변경
2. 최종 아이콘은 앱인토스 콘솔의 앱 정보에서 업로드
3. 샌드박스 앱에서 위치 권한, 로그인, 쿠팡 외부 링크, iframe 쿠키 동작 확인

현재 셸은 운영 웹을 iframe으로 재사용하는 1차 구조입니다. 앱인토스 샌드박스의 쿠키/외부 링크 정책 때문에 Supabase 소셜 로그인이나 새 창 링크가 제한될 수 있으므로 실기기 검증 전에는 출시 가능한 상태로 간주하면 안 됩니다. 제한이 확인되면 화면 코드를 Vite 셸로 옮기는 2차 작업이 필요합니다.

디지털 크레딧 결제는 앱인토스 전용 결제 검토·연동 전까지 노출하지 않습니다.
