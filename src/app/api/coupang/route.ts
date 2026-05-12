import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = "force-dynamic";
export const preferredRegion = 'icn1'; // 🔥 핵심 수술: Vercel 서버를 '서울'로 강제 지정! (쿠팡 해외 IP 차단 방어)

// 쿠팡 API 필수 암호화(HMAC) 함수
function generateHmac(method: string, url: string, secretKey: string, accessKey: string) {
  const parts = url.split('?');
  const path = parts[0];
  const query = parts[1] || '';

  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(2);
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const date = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const datetime = `${year}${month}${date}T${hours}${minutes}${seconds}Z`;

  const message = datetime + method + path + query;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.redirect('https://www.coupang.com');
  }

  // Vercel 환경변수 호출 (띄어쓰기 섞이지 않게 주의!)
  const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY?.trim();
  const SECRET_KEY = process.env.COUPANG_SECRET_KEY?.trim();
  
  // 기본 쿠팡 검색 URL
  const originalUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;

  if (!ACCESS_KEY || !SECRET_KEY) {
    return NextResponse.redirect(originalUrl);
  }

  try {
    const method = 'POST';
    const path = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
    const authorization = generateHmac(method, path, SECRET_KEY, ACCESS_KEY);

    // 쿠팡 딥링크 API 호출
    const response = await fetch(`https://api-gateway.coupang.com${path}`, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coupangUrls: [originalUrl],
        subId: "choiceflow" // 🔥 추가 수익 추적 태그 (선택장애 프로젝트에서 나온 수익임을 명시)
      }),
    });

    const data = await response.json();

    // 정상 발급 시 수익 링크(shortenUrl)로 이동
    if (data.rCode === '0' && data.data && data.data.length > 0) {
      return NextResponse.redirect(data.data[0].shortenUrl);
    } else {
      console.error("Coupang API Error (서버 로그 확인):", data);
      return NextResponse.redirect(originalUrl);
    }
  } catch (error) {
    console.error("Coupang DeepLink Exception:", error);
    return NextResponse.redirect(originalUrl);
  }
}