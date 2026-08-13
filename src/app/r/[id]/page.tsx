import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { SharedResultView } from "@/components/result/shared-result-view";
import {
  readSharedResultPayload,
  sharePreviewText,
  type SharedResultPayload,
} from "@/lib/share/share-payload";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

/** UUID 형식이 아니면 조회 자체를 하지 않는다. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSharedResult(
  id: string
): Promise<SharedResultPayload | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) return null;

  try {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin
      .from("shared_results")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return readSharedResultPayload(data.payload);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const payload = await loadSharedResult(params.id);
  if (!payload) {
    return {
      title: "공유된 결과를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const { title, description } = sharePreviewText(payload);
  return {
    title,
    description,
    // 공유 결과는 사용자가 만든 일회성 페이지다. 검색에 색인되면 안 된다.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedResultPage({ params }: Props) {
  const payload = await loadSharedResult(params.id);
  if (!payload) notFound();
  return <SharedResultView payload={payload} />;
}
