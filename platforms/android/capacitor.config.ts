import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kr.co.ymstudio.choiceflow",
  appName: "ChoiceFlow",
  webDir: "dist",
  appendUserAgent: " ChoiceFlowAndroid/1.0",
  server: {
    url: "https://choice.ymstudio.co.kr/?platform=android",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
