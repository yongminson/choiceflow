import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://choice.ymstudio.co.kr'

  // 🔥 검색엔진을 낚기 위한 '황금 키워드 떡밥 리스트' 
  // (나중에 대표님이 생각나실 때마다 여기에 단어를 계속 추가하시면 자동으로 페이지가 무한 증식합니다!)
  const targetKeywords = [
    "30대-남자-생일선물",
    "20대-여자-생일선물",
    "비오는날-데이트-코스",
    "가성비-노트북-추천",
    "부모님-명절-선물",
    "자취생-필수품",
    "신혼부부-집들이-선물",
    "오늘-뭐먹지-룰렛",
    "결정장애-해결",
    "첫차-중고차-추천",
    "50대-아빠-생일선물",
    "원룸-인테리어-추천"
  ];

  // 키워드 리스트를 사이트맵 규칙에 맞게 자동 변환
  const keywordUrls = targetKeywords.map((keyword) => ({
    url: `${baseUrl}/q/${keyword}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${baseUrl}/?tab=food`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?tab=gift`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?tab=appliance`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // 🔥 위에서 만든 떡밥 키워드 수십 개를 이 밑에 한방에 쏟아붓습니다!
    ...keywordUrls,
  ]
}