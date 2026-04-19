export const CATEGORY_ORDER = [
  "food",      // 🔥 가장 첫 번째로 이동!
  "gift",
  "appliance",
  "fashion",
  "date",
  "asset",
] as const;

export type CategoryId = (typeof CATEGORY_ORDER)[number];

export function isCategoryId(tab: string | null): tab is CategoryId {
  return tab !== null && (CATEGORY_ORDER as readonly string[]).includes(tab);
}