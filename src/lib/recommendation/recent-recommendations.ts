const STORAGE_KEY = "choiceflow-recent-recommendations";

type RecentRecommendation = {
  categoryId: string;
  name: string;
  savedAt: number;
};

function readAll(): RecentRecommendation[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is RecentRecommendation =>
          Boolean(
            item &&
              typeof item.categoryId === "string" &&
              typeof item.name === "string" &&
              typeof item.savedAt === "number"
          )
      )
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function readRecentRecommendationNames(categoryId: string): string[] {
  return readAll()
    .filter((item) => item.categoryId === categoryId)
    .map((item) => item.name)
    .slice(0, 12);
}

export function saveRecentRecommendationNames(
  categoryId: string,
  names: string[]
) {
  const now = Date.now();
  const incoming = names
    .filter(Boolean)
    .slice(0, 3)
    .map((name) => ({ categoryId, name: name.slice(0, 100), savedAt: now }));
  const incomingKeys = new Set(
    incoming.map((item) => `${item.categoryId}:${item.name}`)
  );
  const next = [
    ...incoming,
    ...readAll().filter(
      (item) => !incomingKeys.has(`${item.categoryId}:${item.name}`)
    ),
  ].slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
