import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = 'nodejs';
export const preferredRegion = 'icn1';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.redirect('https://www.coupang.com');
  }

  const PARTNER_ID = "AF7639883";
  const now = Date.now();
  
  const trackingUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}&src=1139000&spec=10799999&addtag=200&lptag=${PARTNER_ID}&itime=${now}&pageType=SEARCH&pageValue=${encodeURIComponent(q)}&wPcid=${now}&wRef=&wTime=${now}&redirect=landing&subid=choiceflow`;

  return NextResponse.redirect(trackingUrl);
}