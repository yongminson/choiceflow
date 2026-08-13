import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // 앱인토스 콘솔에서 만든 appName과 반드시 동일하게 바꾸세요.
  appName: "choiceflow",
  brand: {
    primaryColor: "#2563EB",
  },
  permissions: [
    {
      name: "geolocation",
      access: "access",
    },
  ],
  webBundleDir: "dist",
});
