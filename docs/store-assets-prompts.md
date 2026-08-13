# ChoiceFlow 스토어 이미지 제작 프롬프트

## 공통 브랜드 방향

- 브랜드: ChoiceFlow
- 핵심 메시지: 복잡한 선택을 3개의 질문으로 빠르고 명확하게
- 시각 언어: 밝은 아이보리와 아주 옅은 블루 배경, 코발트 블루 포인트, 정교한 반투명 유리 오브젝트, 부드러운 자연광, 넉넉한 여백
- 금지: 사람 얼굴, 타사 로고, 쿠팡·Google·Toss 로고, 로봇 머리, 회로 기판, 챗봇 말풍선, 과도한 네온, 의미 없는 AI 입자, 가짜 앱 화면, “1위·최고·무료” 같은 심사 위험 문구

생성 이미지에는 글자를 넣지 말고, 글자는 Figma·Canva에서 최종 편집하는 것을 권장합니다. 이미지 생성 모델은 한글을 자주 왜곡합니다.

## 1. Google Play 앱 아이콘

규격: 512×512, 32-bit PNG, 알파 허용, 1MB 이하. Android 런처용 원본은 1024×1024 이상으로도 보관하세요.

```text
Create a premium mobile app icon for a decision assistant named ChoiceFlow. A single sculpted rounded-square symbol divided into two subtle blue lanes that converge into one clear forward path, with a tiny refined check mark at the convergence point. Soft ivory base, vivid cobalt blue and restrained violet accent, high-end 3D glass and enamel material, controlled studio lighting, crisp silhouette readable at 32 pixels, strong centered composition, generous safe margin, no text, no letters, no robot, no brain, no chat bubble, no third-party logo, transparent background outside the icon shape, 1:1 square, production-ready app icon.
```

## 2. Google Play 피처 그래픽

규격: 1024×500, JPEG 또는 24-bit PNG, 알파 금지.

```text
Wide premium editorial key visual for ChoiceFlow, a service that helps people choose food, gifts, appliances, fashion, travel and major purchases. In the center, six elegant miniature objects orbit gently around one calm blue decision path: a plated meal, wrapped gift, modern home appliance, fashion garment, travel suitcase and house key. Bright warm ivory-to-pale-blue background, sophisticated Korean fintech brand quality, subtle depth, restrained 3D materials, soft directional daylight, generous clean space, focal elements inside the central safe zone, no device mockup, no text, no logos, no ranking badge, no sale message, no dark cyberpunk, 1024 by 500 landscape.
```

권장 후편집 문구: `고민은 짧게, 선택은 확실하게.` 문구가 잘릴 수 있으므로 중앙 안전영역에 작게 배치합니다.

## 3. Google Play 스크린샷 배경

스크린샷은 AI로 가짜 화면을 만들지 말고 실제 Android 앱을 캡처해야 합니다. 권장 크기 1080×1920, 최소 4장입니다. 아래 프롬프트는 실제 화면 뒤에 놓을 장식 배경만 생성할 때 사용합니다.

```text
Minimal vertical presentation background for a premium Korean mobile app screenshot. Warm ivory upper area flowing into pale blue lower area, one subtle cobalt curved line suggesting a guided decision path, soft paper-like grain, extremely clean, lots of negative space, no text, no UI, no phone frame, no logo, no objects, 9:16 portrait, 1080 by 1920.
```

실제 캡처 순서:

1. 메뉴 6개가 보이는 메인 화면 — `무엇을 고를지, 여기서 시작`
2. 선택 버튼형 3단계 질문 — `세 번의 선택으로 빠르게`
3. 음식점 평점·후기·거리 결과 — `내 주변까지 고려한 추천`
4. 상품 후보 3개와 선택 근거 — `가격과 조건을 한눈에 비교`
5. 상세 질문 펼침 화면 — `더 꼼꼼하게 보고 싶을 때`

## 4. 앱인토스 아이콘

앱인토스 콘솔에 표시되는 최신 규격을 먼저 확인한 뒤 1:1 PNG로 내보내세요. Google Play 아이콘과 같은 심볼을 사용하되 작은 화면에서 더 선명하도록 세부 묘사를 줄입니다.

```text
Ultra-clean mini app icon for ChoiceFlow in a Korean finance super-app environment. One bold cobalt-blue decision path smoothly merging from two choices into a single checked destination, rounded friendly geometry, pristine white and very pale blue background, subtle premium depth but mostly flat for perfect small-size legibility, centered with generous safe area, trustworthy and calm, no text, no letters, no robot, no sparkle cluster, no third-party branding, 1:1 square.
```

## 5. 앱인토스 소개·피처 이미지

콘솔이 요구하는 정확한 비율과 파일 크기는 앱 등록 화면의 최신 안내를 우선합니다. 아래는 가로형 원본 제작용입니다.

```text
Premium horizontal promotional illustration for ChoiceFlow inside a modern Korean finance app. A clear guided path moves through three tactile choice cards and arrives at three neatly ranked recommendation cards. Nearby are restrained category objects for food, gift and appliance, all rendered as refined miniature 3D objects. White and pale sky-blue palette with one confident cobalt accent, clean Korean product-design sensibility, soft natural shadows, spacious and reassuring, no text, no phone frame, no Toss logo, no other brand logos, no AI robot imagery, no exaggerated glow, high resolution landscape master artwork.
```

권장 후편집 문구: `세 가지만 고르면, 선택지가 선명해져요.`

## 6. 앱인토스 실제 화면 캡처

앱인토스 샌드박스에서 최종 번들을 실행한 뒤 캡처합니다. 웹 브라우저 캡처를 대신 사용하면 상단 내비게이션과 안전영역이 달라질 수 있습니다.

- 첫 화면
- 3단계 질문
- 음식 추천 결과
- 상품 추천 결과
- 오류 후 다시 시도 화면

실제 제공하지 않는 평점·후기·가격이나 가짜 사용자 후기는 이미지에 넣지 않습니다.
