"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Phone, User, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConsultationForm({ categoryName = "고가자산/렌탈" }: { categoryName?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", details: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("이름과 연락처를 입력해주세요.");
      return;
    }
    if (!agreed) {
      toast.error("개인정보 수집·이용 동의가 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryName, ...formData, privacyAgreed: true }),
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
          혼자 결정하기 어려운 고가자산 및 렌탈 상품, 검증된 전문가가 확실한 혜택과 해답을 드립니다. (상담비 전액 무료)
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
          <textarea placeholder="관심 있는 상품이나 궁금하신 점을 간단히 적어주세요. (선택)" value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="min-h-[100px] w-full resize-none rounded-xl border-0 bg-white/10 pl-12 pr-4 pt-3 text-white placeholder:text-slate-400 focus:bg-white/20 focus:ring-2 focus:ring-blue-500 transition-colors" />
        </div>
        {/*
          "신청 시 동의한 것으로 간주" 방식은 개인정보보호법이 요구하는 동의로
          보기 어렵다. 수집 항목·목적·보유 기간과 거부할 권리를 먼저 알리고,
          이용자가 직접 체크해야 신청이 진행되도록 한다.
        */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-slate-500 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-[12px] leading-relaxed text-slate-300">
            <strong className="text-white">(필수) 개인정보 수집·이용에 동의합니다.</strong>
            <span className="mt-1.5 block text-slate-400">
              수집 항목: 성함, 연락처, 문의 내용<br />
              이용 목적: 상담 신청 접수 및 회신<br />
              보유 기간: 상담 종료 후 3년 (전자상거래법에 따른 분쟁 처리 기록)
            </span>
            <span className="mt-1.5 block text-slate-400">
              동의를 거부하실 수 있으며, 이 경우 상담 신청만 이용할 수 없습니다.
              다른 기능은 그대로 이용하실 수 있습니다. 자세한 내용은{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-blue-300 underline underline-offset-2"
              >
                개인정보처리방침
              </a>
              을 확인해 주세요.
            </span>
          </span>
        </label>

        <Button type="submit" disabled={isSubmitting || !agreed} className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50">
          {isSubmitting ? "신청 중..." : (
            <>무료 상담 신청하기 <Send className="ml-2 size-5" /></>
          )}
        </Button>
      </form>
    </div>
  );
}