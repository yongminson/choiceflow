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

export const CATEGORY_LABEL: Record<BlogPost["categoryId"], string> = {
  food: "음식",
  gift: "선물",
  appliance: "가전·디지털",
  fashion: "패션",
  date: "여행·데이트",
  asset: "렌탈·큰 지출",
};
