/**
 * Reserved for Coupang Partners badges, disclosures, or partner creatives.
 * Wire your affiliate components or iframes here when ready.
 */
export function MonetizationPartnersStrip() {
  return (
    <aside
      aria-label="Partner placement"
      className="border-b border-border/50 bg-muted/30"
    >
      <div className="mx-auto flex min-h-[44px] max-w-5xl items-center justify-center px-6 py-2">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          쿠팡 파트너스 영역 · 링크·배너·고지문을 이 슬롯에 배치할 수 있어요.
        </p>
      </div>
    </aside>
  );
}
