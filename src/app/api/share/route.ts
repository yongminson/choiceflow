import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import {
  MAX_SHARE_PAYLOAD_BYTES,
  toSharedResultPayload,
} from "@/lib/share/share-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 추천 결과를 공유 가능한 주소로 만든다.
 *
 * 결과는 sessionStorage 에만 있어 링크를 받은 사람은 빈 화면을 봤다.
 * 공유를 누른 시점의 결과를 저장하고 짧은 id 를 돌려준다.
 */
export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { ok: false, error: "공유 기능이 아직 설정되지 않았습니다." },
      { status: 503, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청을 읽지 못했습니다." },
      { status: 400, headers: NO_STORE }
    );
  }

  const payload = toSharedResultPayload(
    (body as { result?: unknown } | null)?.result
  );
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "공유할 추천 결과가 없습니다." },
      { status: 400, headers: NO_STORE }
    );
  }

  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_SHARE_PAYLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "결과가 너무 커서 공유할 수 없습니다." },
      { status: 413, headers: NO_STORE }
    );
  }

  // 로그인은 필요 없다. 로그인한 경우에만 누가 만들었는지 함께 남긴다.
  let createdBy: string | null = null;
  try {
    const {
      data: { user },
    } = await createRouteHandlerSupabaseClient(request).auth.getUser();
    createdBy = user?.id ?? null;
  } catch {
    createdBy = null;
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin
      .from("shared_results")
      .insert({
        payload,
        category: payload.categoryId ?? null,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("[share] insert failed", error?.message);
      return NextResponse.json(
        { ok: false, error: "공유 링크를 만들지 못했습니다." },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { ok: true, id: data.id, path: `/r/${data.id}` },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[share] unexpected", error);
    return NextResponse.json(
      { ok: false, error: "공유 링크를 만들지 못했습니다." },
      { status: 500, headers: NO_STORE }
    );
  }
}
