"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase";

/** undefined = 아직 확인 전, null = 비로그인 */
export function useSupabaseUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createBrowserSupabaseClient();
      void supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ?? null);
      });
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      subscription = sub;
    } catch (e) {
      console.error(e);
      setUser(null);
    }
    return () => subscription?.unsubscribe();
  }, []);

  return user;
}
