import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 개인화되거나 일회성인 주소는 색인 대상이 아니다.
      // /r/ 은 사용자가 만든 공유 결과라 검색에 뜨면 안 된다.
      disallow: ['/api/', '/mypage/', '/login', '/admin', '/r/', '/payment/'],
    },
    sitemap: 'https://choice.ymstudio.co.kr/sitemap.xml',
  }
}