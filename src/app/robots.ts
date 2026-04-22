import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/mypage/'], // API나 마이페이지는 검색엔진에 안 뜨게 막음
    },
    sitemap: 'https://choice.ymstudio.co.kr/sitemap.xml',
  }
}