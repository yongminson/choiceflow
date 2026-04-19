/**
 * Reserved for Toss Payments checkout, billing portal, or promo strip.
 */
export function MonetizationPaymentsSlot() {
  return (
    <section
      aria-label="Payments placement"
      className="border-t border-border/60 bg-secondary/40"
    >
      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            토스페이먼츠 연동 영역
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            구독·단건 결제 위젯, 프로모션 배너, 영수증 안내를 여기에 붙이면
            됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
