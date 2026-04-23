"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Phone, User, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConsultationForm({ categoryName = "고가자산" }: { categoryName?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", details: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("이름과 연락처를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryName, ...formData }),
      });

      if (!res.ok) throw new Error("서버 에러");

      setIsSuccess(true);
      toast.success("상담 신청이 완료되었습니다! 전문가가 곧 연락드릴 예정입니다.");
    } catch (e) {
      toast.error("신청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 신청 완료 시 보여줄 화면
  if (isSuccess) {
    return (
      <div className="mt-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 p-8 text-center border border-indigo-100 shadow-sm dark:from-indigo-950/30 dark:to-blue-900/20 dark:border-indigo-900/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground">상담 신청 접수 완료!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          담당 전문가가 배정되어 24시간 내에 기재해주신 연락처로 연락드릴 예정입니다.
        </p>
      </div>
    );
  }

  // 기본 폼 화면 (프리미엄 다크 디자인)
  return (
    <div className="mt-12 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl w-full max-w-3xl mx-auto">
      <div className="mb-6 text-center sm:text-left">
        <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md border border-blue-500/30">
          상위 1% 전문가 1:1 매칭
        </span>
        <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          AI 분석을 넘어,<br className="sm:hidden" /> 진짜 전문가와 상의하세요.
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          혼자 결정하기 어려운 고가자산, 검증된 전문가가 확실한 해답을 드립니다. (상담비 전액 무료)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <User className="size-5 text-slate-400" />
          </div>
          <input type="text" placeholder="성함 (또는 직책)" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 w-full rounded-xl border-0 bg-white/10 pl-12 pr-4 text-white placeholder:text-slate-400 focus:bg-white/20 focus:ring-2 focus:ring-blue-500 transition-colors" required />
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Phone className="size-5 text-slate-400" />
          </div>
          <input type="tel" placeholder="연락처 (010-XXXX-XXXX)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-12 w-full rounded-xl border-0 bg-white/10 pl-12 pr-4 text-white placeholder:text-slate-400 focus:bg-white/20 focus:ring-2 focus:ring-blue-500 transition-colors" required />
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute top-3 left-0 flex items-start pl-4">
            <FileText className="size-5 text-slate-400" />
          </div>
          <textarea placeholder="궁금하신 점이나 현재 상황을 간단히 적어주세요. (선택)" value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="min-h-[100px] w-full resize-none rounded-xl border-0 bg-white/10 pl-12 pr-4 pt-3 text-white placeholder:text-slate-400 focus:bg-white/20 focus:ring-2 focus:ring-blue-500 transition-colors" />
        </div>
        <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25">
          {isSubmitting ? "신청 중..." : (
            <>무료 상담 신청하기 <Send className="ml-2 size-5" /></>
          )}
        </Button>
        <p className="text-center text-[11px] text-slate-400">
          신청 시 개인정보 수집 및 제공에 동의하는 것으로 간주됩니다.
        </p>
      </form>
    </div>
  );
}