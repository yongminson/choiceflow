This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Coupang Partners API diagnostics

Copy the variable names in `.env.example` to `.env.local` or your serverless
environment. `COUPANG_SECRET_KEY` and `COUPANG_DIAGNOSTIC_TOKEN` are server-only
values and must never use a `NEXT_PUBLIC_` prefix.

- `GET /api/coupang/health` checks whether the required server variables exist.
- `POST /api/coupang/health` performs a live deep-link probe and requires
  `Authorization: Bearer <COUPANG_DIAGNOSTIC_TOKEN>`.

The live probe returns only status metadata. It never returns credentials,
authorization headers, or the generated affiliate URL.

## Quick recommendation data providers

The button-first recommendation flow asks for a category and then three basic
questions: detailed use, priority, and a category-specific budget. It returns
four purpose-specific results (best overall, lowest-price/value, reliability,
and premium), and all four are shown. The AI is called on the first request, not
only on refinement. A user can optionally answer up to five additional
button-only questions and request a refined result at any point; that button is
disabled when the AI is unavailable, because the refined result would be
identical to the fallback. It works without optional providers and returns a
non-empty fallback result when AI or external APIs fail. Recent conditions are
stored only in the current browser so they can be run again without signing in.

Shopping categories (gift, appliance, fashion) send every result through
`/api/coupang`, which builds a Coupang Partners deep link server-side and falls
back to a plain Coupang search URL when credentials are missing. Search keywords
are generated as "product type + distinguishing condition" so the Coupang result
page is narrow enough to convert. Outbound clicks emit a `affiliate_click`
Google Analytics event with the category, selection type, and position.

- `GEMINI_API_KEY`: creates four purpose-specific candidates. It does not invent live
  prices, ratings, or review counts. `GEMINI_MODEL` is optional; when unset the
  route tries several known model ids and remembers the first that responds, so a
  renamed model does not silently drop every recommendation to the static fallback.
- `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`: server-only Naver Shopping Search
  credentials for the legacy integration. Product queries request ascending
  price order. The displayed value is the lowest price exposed by the API at
  lookup time; shipping, coupons, options, and stock can change the checkout
  total. NAVER ended this Shopping Search API on 2026-07-31, so price lookups no
  longer return data. The lookup is kept behind a short timeout and the UI now
  drives users to Coupang for the current price instead of showing a stale one.
- `GOOGLE_PLACES_API_KEY`: optional, server-only nearby restaurant provider.
  Rating and review-count fields are billable Google Maps Platform fields.
  Leave it blank until billing and quota limits are explicitly approved.

`GET /api/recommend/health` reports only whether each provider is configured.
It never returns key values. Browser geolocation is requested only after the
user chooses a food scenario, and the precise location is not persisted by the
quick recommendation route.
