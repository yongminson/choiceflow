import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = "force-dynamic";
export const runtime = 'nodejs';
export const preferredRegion = 'icn1';
export const fetchCache = 'force-no-store'; // 🔥 캐시 완전 비활성화

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

  const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY?.trim();
  const SECRET_KEY = process.env.COUPANG_SECRET_KEY?.trim();
  
  const originalUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;

  if (!ACCESS_KEY || !SECRET_KEY) {
    console.error("❌ 환경변수 없음");
    return NextResponse.redirect(originalUrl);
  }

  try {
    const method = 'POST';
    const path = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
    const authorization = generateHmac(method, path, SECRET_KEY, ACCESS_KEY);

    const response = await fetch(`https://api-gateway.coupang.com${path}`, {
      method: 'POST',
      cache: 'no-store', // 🔥 캐시 비활성화
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coupangUrls: [originalUrl],
        subId: "choiceflow"
      }),
    });

    const data = await response.json();
    console.log("✅ rCode:", data.rCode, "| data:", JSON.stringify(data).slice(0, 200));

    if (data.rCode === '0' && data.data && data.data.length > 0) {
      return NextResponse.redirect(data.data[0].shortenUrl);
    } else {
      console.error("❌ Coupang API Error:", JSON.stringify(data));
      return NextResponse.redirect(originalUrl);
    }
  } catch (error) {
    console.error("❌ Exception:", error);
    return NextResponse.redirect(originalUrl);
  }
}
