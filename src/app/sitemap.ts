import { MetadataRoute } from "next";

const BASE_URL = "https://choice.ymstudio.co.kr";

/**
 * 사이트맵.
 *
 * 실제로 내용이 있는 페이지만 넣는다.
 *
 * 예전에는 /q/<키워드> 주소 12개를 여기에 쏟아부었는데, 그 페이지들은
 * 제목의 단어만 바뀐 같은 템플릿이었고 어디에서도 링크되지 않는 고아
 * 페이지였다. 검색엔진은 이런 묶음을 doorway page 로 보고 색인에서
 * 빼거나 사이트 전체 평가를 낮춘다. 유입 장치가 아니라 위험 요소였다.
 *
 * 키워드 페이지가 다시 필요해지면, 그때는 그 키워드에만 해당하는 실제
 * 내용(비교 기준, 후보, 주의점)을 갖춘 페이지로 만들어야 한다.
 *
 * 로그인·마이페이지·결제 결과·공유 결과처럼 개인화되거나 일회성인
 * 주소는 색인 대상이 아니므로 넣지 않는다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/account/delete`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
