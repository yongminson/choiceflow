import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { validateBlogPost, type BlogPost } from "@/lib/blog/post-schema";

const POSTS_DIR = path.join(process.cwd(), "content/blog/posts");

/**
 * 저장된 글을 읽는다.
 *
 * 화면에서도 다시 검증한다. 생성 스크립트를 거치지 않고 파일이 들어오거나
 * 손으로 고치다 형식이 깨지면, 반쯤 빈 글이 그대로 공개되기 때문이다.
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  if (!existsSync(POSTS_DIR)) return [];

  const files = (await readdir(POSTS_DIR)).filter((name) =>
    name.endsWith(".json")
  );

  const posts = await Promise.all(
    files.map(async (name) => {
      try {
        const raw = JSON.parse(
          await readFile(path.join(POSTS_DIR, name), "utf8")
        );
        const result = validateBlogPost(raw);
        if (!result.ok) {
          console.warn(`[blog] ${name} 형식 미달로 제외:`, result.problems);
          return null;
        }
        return result.post;
      } catch (error) {
        console.warn(`[blog] ${name} 읽기 실패:`, error);
        return null;
      }
    })
  );

  return posts
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

/**
 * 글 사이를 잇는 링크에 쓸 다른 글을 고른다.
 *
 * 목록 페이지와 sitemap 에만 걸려 있으면 검색엔진이 글마다 도달하는 경로가
 * 얕다. 실제로 같은 방식으로 운영하는 블로그에서 색인되지 않은 페이지의
 * 대부분이 "발견됨 - 현재 색인이 생성되지 않음"이었다. 주소는 알지만
 * 크롤링 순서가 오지 않은 상태다.
 *
 * 같은 카테고리 글을 먼저 잇고 모자라면 최근 글로 채워, 어느 글에서 출발해도
 * 다른 글로 이어지게 한다.
 */
export async function getRelatedPosts(
  post: BlogPost,
  limit = 3
): Promise<BlogPost[]> {
  const others = (await getAllPosts()).filter(
    (item) => item.slug !== post.slug
  );

  const sameCategory = others.filter(
    (item) => item.categoryId === post.categoryId
  );
  const rest = others.filter((item) => item.categoryId !== post.categoryId);

  return [...sameCategory, ...rest].slice(0, limit);
}

export const CATEGORY_LABEL: Record<BlogPost["categoryId"], string> = {
  food: "음식",
  gift: "선물",
  appliance: "가전·디지털",
  fashion: "패션",
  date: "여행·데이트",
  asset: "렌탈·큰 지출",
};
