"use client";

import { useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SajuImportButton() {
  const [loading, setLoading] = useState(false);

  async function handleLoadSaju() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("[ChoiceFlow] profiles 조회 오류", profileError);
        toast.error("프로필 정보를 불러오지 못했습니다");
        return;
      }

      if (!profile) {
        console.log("[ChoiceFlow] profiles 행 없음", { userId: user.id });
        toast.info("저장된 사주 정보가 없습니다");
        return;
      }

      console.log("[ChoiceFlow] 명운 DB — 생년월일시(프로필)", {
        userId: user.id,
        profile,
      });
      toast.success("생년월일시 정보를 콘솔에 출력했습니다");
    } catch (e) {
      console.error(e);
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      title="내 사주 정보 불러오기"
      className="h-8 gap-1.5 rounded-full border border-transparent px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground shadow-none hover:border-border/60 hover:bg-muted/50 hover:text-foreground"
      onClick={handleLoadSaju}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin opacity-70" aria-hidden />
      ) : (
        <ScrollText className="size-3 opacity-70" aria-hidden />
      )}
      내 사주
    </Button>
  );
}
