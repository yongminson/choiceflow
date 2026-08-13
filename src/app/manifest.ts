import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChoiceFlow",
    short_name: "ChoiceFlow",
    description: "몇 가지 선택만으로 음식, 선물, 가전, 패션, 여행과 큰 지출 후보를 비교하는 선택 도우미",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#2563eb",
    lang: "ko-KR",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
