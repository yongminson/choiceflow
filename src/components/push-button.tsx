"use client";

import { useState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";

// 브라우저용 키 변환 마법 공식
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

export function PushButton() {
  const user = useSupabaseUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // 알림 기능을 지원하는 브라우저인지 확인
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
        toast.error("알림이 차단되었습니다. 브라우저 설정에서 허용해 주세요!");
        return;
      }

      // 우편집배원(sw.js) 등록
      const registration = await navigator.serviceWorker.register("/sw.js");
      
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Public Key가 없습니다.");

      // 푸시 알림 구독증 발급
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 발급받은 구독증을 우리 서버 장부에 저장
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?.id || null,
        }),
      });

      setIsSubscribed(true);
      toast.success("🎉 이제 매일 무료 랜덤뽑기 알림을 보내드릴게요!");
    } catch (e) {
      console.error(e);
      toast.error("알림 설정에 실패했습니다.");
    }
  };

  // 이미 구독했거나, 지원 안 하는 브라우저면 버튼 숨기기
  if (isSubscribed || !isSupported) return null;

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