import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = "force-dynamic";

// 쿠팡 API 필수 암호화(HMAC) 함수
function generateHmac(method: string, url: string, secretKey: string, accessKey: string) {
  const parts = url.split('?');
  const path = parts[0];
  const query = parts[1] || '';

  const now = new Date();
  // YYMMDDTHHMMSSZ 포맷 생성
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

  // Vercel과 .env.local에 등록한 키를 불러옵니다.
  const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
  const SECRET_KEY = process.env.COUPANG_SECRET_KEY;
  
  // 기본 쿠팡 검색 URL
  const originalUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;

  // 키가 없으면 그냥 일반 검색으로 넘깁니다 (에러 방지)
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
      }),
    });

    const data = await response.json();

    // 정상적으로 수수료 링크(shortenUrl)가 발급되었다면 거기로 보냅니다!
    if (data.rCode === '0' && data.data && data.data.length > 0) {
      return NextResponse.redirect(data.data[0].shortenUrl);
    } else {
      console.error("Coupang API Error:", data);
      return NextResponse.redirect(originalUrl); // API 실패시 일반 링크로 안전하게 이동
    }
  } catch (error) {
    console.error("Coupang DeepLink Exception:", error);
    return NextResponse.redirect(originalUrl);
  }
}