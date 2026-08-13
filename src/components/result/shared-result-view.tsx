import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Minus, Sparkles } from "lucide-react";

import type { SharedResultPayload } from "@/lib/share/share-payload";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  best: "가장 추천",
  value: "가성비 선택",
  reliable: "검증 우선",
  premium: "한 단계 위",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 공유 링크로 들어온 사람이 보는 읽기 전용 결과.
 *
 * 정밀 질문·재추천 같은 조작 기능은 넣지 않는다. 받은 사람의 목적은
 * "무엇을 골라줬는지" 확인이고, 그다음 행동은 직접 해보기다.
 */
export function SharedResultView({
  payload,
}: {
  payload: SharedResultPayload;
}) {
  const winner = payload.recommendations[0];
  const isFood = payload.categoryId === "food";
  const isCoupang =
    payload.categoryId === "gift" ||
    payload.categoryId === "appliance" ||
    payload.categoryId === "fashion";
  const context = [
    payload.scenarioLabel,
    payload.priorityLabel && `${payload.priorityLabel} 우선`,
    payload.budgetLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-8 sm:px-8">
      <p className="text-[12px] font-bold text-muted-foreground">
        ChoiceFlow가 고른 결과{context ? ` · ${context}` : ""}
      </p>
      <h1 className="mt-2 break-keep text-[28px] font-black leading-[1.2] tracking-[-0.03em] sm:text-[34px]">
        {winner.name}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        {winner.reason}
      </p>

      {payload.userWish && (
        <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">요청 반영: {payload.userWish}</span>
        </p>
      )}

      <h2 className="mb-3 mt-8 text-[20px] font-black tracking-tight">
        비교한 후보 {payload.recommendations.length}개
      </h2>

      {isCoupang && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {payload.recommendations.map((item, index) => (
          <article
            key={`${item.selectionType || index}-${item.name}`}
            className={cn(
              "flex flex-col rounded-2xl border bg-card p-4 sm:p-5",
              index === 0 ? "border-primary ring-1 ring-primary/20" : "border-border"
            )}
          >
            <span
              className={cn(
                "inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-black",
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index === 0 ? "🏆 " : ""}
              {ROLE_LABEL[item.selectionType || "best"] || "추천"}
            </span>

            <div className="mt-3 flex gap-3 lg:flex-col">
              {item.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.imageUrl}
                  alt=""
                  width={84}
                  height={84}
                  loading="lazy"
                  decoding="async"
                  className="size-[84px] shrink-0 rounded-xl border border-border object-cover lg:h-[168px] lg:w-full"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="break-keep text-[18px] font-black leading-snug">
                  {item.name}
                </h3>
                {typeof item.price === "number" && (
                  <p className="mt-1.5 text-[20px] font-black tabular-nums">
                    {formatPrice(item.price)}
                    <span className="text-[14px] font-bold">원</span>
                  </p>
                )}
                {item.isRocket && (
                  <span className="mt-1 inline-block rounded bg-[#ae0000]/[0.08] px-1.5 py-0.5 text-[10px] font-black text-[#ae0000] dark:text-red-400">
                    로켓배송
                  </span>
                )}
              </div>
            </div>

            {item.fitChecks?.length ? (
              <ul className="mt-3.5 space-y-1.5">
                {item.fitChecks.map((check) => (
                  <li
                    key={check.text}
                    className="flex items-start gap-2 text-[13.5px] leading-snug"
                  >
                    {check.ok ? (
                      <Check className="mt-[3px] size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Minus className="mt-[3px] size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className={cn(!check.ok && "text-muted-foreground")}>
                      {check.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
                {item.reason}
              </p>
            )}

            {item.sourceUrl && (
              <div className="mt-auto pt-4">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={cn(
                    "flex min-h-[48px] w-full items-center justify-center rounded-lg px-3 text-center text-[15px] font-black transition",
                    isFood
                      ? "border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      : isCoupang
                        ? "bg-[#ae0000] text-white hover:bg-[#8f0000]"
                        : "border border-[#03c75a] text-[#03c75a] hover:bg-[#03c75a]/5"
                  )}
                >
                  {item.sourceLabel ||
                    (isFood ? "지도에서 보기" : "판매처에서 확인")}
                  <ExternalLink className="ml-2 size-4 shrink-0" />
                </a>
              </div>
            )}
          </article>
        ))}
      </div>

      {payload.advisory && (
        <section className="mt-7 rounded-2xl border-l-4 border-amber-500 bg-amber-50/60 p-5 dark:bg-amber-950/25">
          <p className="text-[13px] font-black text-amber-900 dark:text-amber-200">
            결정 전에 꼭 확인하세요
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-amber-900/85 dark:text-amber-100/85">
            {payload.advisory}
          </p>
        </section>
      )}

      {/* 링크를 받고 들어온 사람이 다음에 할 행동. 이게 이 페이지의 목적이다. */}
      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary-soft p-6 text-center sm:p-8">
        <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">
          같은 고민 중이신가요?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          몇 번만 누르면 내 조건에 맞춰 하나를 골라드려요. 가입도, 로그인도
          필요 없습니다.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 text-[15px] font-black text-primary-foreground transition hover:opacity-90"
        >
          내 조건으로 추천받기
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </section>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
        이 페이지는 공유된 시점의 결과를 그대로 보여줍니다. 가격·재고·영업
        상태는 바뀔 수 있으니 이동한 판매처나 지도에서 다시 확인하세요.
      </p>
    </main>
  );
}
