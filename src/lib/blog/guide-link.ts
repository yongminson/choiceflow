import type { BlogPost } from "@/lib/blog/post-schema";

/**
 * 다른 화면에서 글로 넘어가는 링크에 필요한 만큼만 추린 형태.
 *
 * 글 본문에는 기준·실수·체크리스트가 통째로 들어 있어 그대로 넘기면
 * 화면 한 번 그리는 데 필요 없는 양이 같이 실린다. 링크에 쓰는 것은
 * 주소와 제목, 한 줄 설명뿐이다.
 */
export type GuideLink = {
  slug: string;
  title: string;
  description: string;
  categoryId: BlogPost["categoryId"];
};

/**
 * 분야 이름표.
 *
 * 글을 읽어 오는 쪽(posts.ts)은 파일 시스템을 쓰기 때문에 브라우저로
 * 내려가는 화면에서는 불러올 수 없다. 이름표는 링크에도 필요하므로
 * 파일을 읽지 않는 이 쪽에 둔다.
 */
export const CATEGORY_LABEL: Record<BlogPost["categoryId"], string> = {
  food: "음식",
  gift: "선물",
  appliance: "가전·디지털",
  fashion: "패션",
  date: "여행·데이트",
  asset: "렌탈·큰 지출",
};

export function toGuideLinks(posts: BlogPost[]): GuideLink[] {
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    categoryId: post.categoryId,
  }));
}

/**
 * 지금 보고 있는 화면에 맞는 글을 고른다.
 *
 * 결과 화면에서 링크를 걸 때 아무 글이나 걸면 읽히지 않는다. 밥솥을
 * 추천받은 사람에게 데이트 코스 글을 내놓는 셈이다. 같은 분야 글을 먼저
 * 채우고, 모자라면 최근 글로 메운다.
 *
 * 분야를 모를 때는 최근 글을 그대로 쓴다. 링크를 비우는 것보다 낫다.
 */
export function pickGuideLinks(
  links: GuideLink[],
  categoryId: string | undefined,
  limit = 3
): GuideLink[] {
  if (!categoryId) return links.slice(0, limit);
  const same = links.filter((link) => link.categoryId === categoryId);
  const rest = links.filter((link) => link.categoryId !== categoryId);
  return [...same, ...rest].slice(0, limit);
}
