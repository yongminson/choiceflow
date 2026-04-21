import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce', // 🌟 핵심: 샵(#) 대신 물음표(?code=)로 받아오게 강제하는 마법의 코드!
      }
    }
  );
}