"use client";

import { useState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 🔥 variant 속성을 추가해서 '큰 버튼'과 '작은 종 모양 아이콘' 두 가지로 쓸 수 있게 만들었습니다!
export function PushButton({ variant = "default" }: { variant?: "default" | "icon" }) {
  const user = useSupabaseUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }
    if (Notification.permission === "granted") {
      setIsSubscribed(true);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("알림이 차단되었습니다. 브라우저 주소창 왼쪽 자물쇠를 눌러 알림을 허용해 주세요!");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Public Key가 없습니다.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?.id || null,
        }),
      });

      setIsSubscribed(true);
      toast.success("🎉 알림 설정 완료! 매일 무료 랜덤뽑기 알림을 쏴드릴게요!");
    } catch (e) {
      console.error(e);
      toast.error("알림 설정에 실패했습니다.");
    }
  };

  // 이미 구독했거나, 브라우저가 지원 안 하면 아예 안 보임
  if (isSubscribed || !isSupported) return null;

  // 🔥 상단 네비게이션용 귀여운 아이콘 모드!
  if (variant === "icon") {
    return (
      <button 
        onClick={handleSubscribe} 
        title="무료뽑기 알림 받기"
        className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shadow-sm transition-transform hover:scale-110 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400"
      >
        <BellRing className="size-5 animate-pulse" />
      </button>
    );
  }

  // 기존 환영 모달용 큰 버튼 모드
  return (
    <button 
      onClick={handleSubscribe} 
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-[14px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] animate-in zoom-in"
    >
      <BellRing className="size-5 animate-pulse" />
      매일 무료뽑기 & 크레딧 알림 받기
    </button>
  );
}