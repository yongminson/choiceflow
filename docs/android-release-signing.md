# ChoiceFlow Android 릴리스 서명

Play Console에 올릴 AAB에는 업로드 키 서명이 필요합니다. 업로드 키와 비밀번호는 Git, 메신저, 클라우드 공개 폴더에 올리지 않습니다.

## 1. 업로드 키 생성

PowerShell에서 다음 명령을 실행합니다. 비밀번호와 이름 정보는 터미널 질문에 직접 입력합니다.

```powershell
cd F:\choiceflow\platforms\android\android
& "G:\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore choiceflow-upload.jks -alias choiceflow-upload -keyalg RSA -keysize 2048 -validity 10000
```

`keytool.exe` 위치가 다르면 Android Studio의 `jbr\bin\keytool.exe` 실제 경로를 사용합니다.

## 2. 로컬 서명 설정

`keystore.properties.example`을 같은 폴더의 `keystore.properties`로 복사하고, 생성할 때 입력한 비밀번호로 두 값을 교체합니다.

```powershell
Copy-Item .\keystore.properties.example .\keystore.properties
notepad .\keystore.properties
```

`keystore.properties`와 `choiceflow-upload.jks`는 `.gitignore`로 제외됩니다.

## 3. 서명된 AAB 생성

```powershell
cd F:\choiceflow
npm run android:build:bundle
```

결과 파일:

`F:\choiceflow\platforms\android\android\app\build\outputs\bundle\release\app-release.aab`

## 4. 반드시 별도 백업

- `choiceflow-upload.jks`
- alias 이름
- store/key 비밀번호

암호화된 저장소 두 곳에 백업합니다. 키를 분실하면 이후 업데이트 제출이 지연되거나 Play Console의 업로드 키 재설정 절차가 필요할 수 있습니다.
