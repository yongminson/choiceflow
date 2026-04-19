/** 크레딧 단건 팩 — UI·서버 검증에 공통 사용 */
export type CreditPackId = "1" | "5" | "10";

export type CreditPack = {
  id: CreditPackId;
  credits: number;
  priceWon: number;
  title: string;
  subtitle?: string;
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  {
    id: "1",
    credits: 1,
    priceWon: 1_000,
    title: "1 크레딧",
  },
  {
    id: "5",
    credits: 5,
    priceWon: 4_500,
    title: "5 크레딧",
    subtitle: "10% 할인",
  },
  {
    id: "10",
    credits: 10,
    priceWon: 8_000,
    title: "10 크레딧",
    subtitle: "20% 할인",
  },
] as const;

const packById: Record<CreditPackId, CreditPack> = {
  "1": CREDIT_PACKS[0],
  "5": CREDIT_PACKS[1],
  "10": CREDIT_PACKS[2],
};

export function getCreditPackById(id: unknown): CreditPack | null {
  if (id === "1" || id === "5" || id === "10") return packById[id];
  return null;
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR");
}
