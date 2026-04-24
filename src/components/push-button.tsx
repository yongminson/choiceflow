"use client";

import { useState, useEffect } from "react";
import { BellRing, BellOff } from "lucide-react";
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

export function PushButton({ variant = "default" }: { variant?: "default" | "icon" }) {
  const user = useSupabaseUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }
    // 🔥 [핵심 수정] 우체부(sw.js)를 확실하게 고용(register)합니다!
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setIsSubscribed(true);
      });
    });
  }, []);

  const handleToggle = async () => {
    try {
      if (!isSubscribed) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("알림이 차단되었습니다. 설정에서 허용해 주세요!");
          return;
        }
      }

      // 🔥 대기 타지 않고 직접 우체부를 호출합니다. (버튼 먹통 방지)
      const registration = await navigator.serviceWorker.register('/sw.js');

      // 🔴 켜져 있다면 -> 끈다!
      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        setIsSubscribed(false);
        toast.info("알림이 해제되었습니다. 🔕");
        return;
      }

      // 🟢 꺼져 있다면 -> 켠다!
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?.id || null,
        }),
      });

      if (!res.ok) throw new Error("DB 저장 실패");

      setIsSubscribed(true);
      toast.success("🎉 알림 켜기 완료!");
      
    } catch (e: any) {
      console.error(e);
      toast.error(`오류 발생: ${e.message}`);
    }
  };

  if (!isSupported) return null;

  if (variant === "icon") {
    return (
      <button 
        onClick={handleToggle} 
        title={isSubscribed ? "알림 끄기" : "알림 켜기"}
        className="relative z-50 flex size-9 items-center justify-center rounded-full bg-indigo-50 shadow-sm transition-transform hover:scale-110 hover:bg-indigo-100 dark:bg-white/10 touch-manipulation cursor-pointer"
      >
        {isSubscribed ? (
          <BellRing className="size-5 text-emerald-500" /> 
        ) : (
          <BellOff className="size-5 text-slate-400 animate-bounce" />
        )}
      </button>
    );
  }

  return (
    <button 
      onClick={handleToggle} 
      className={`relative z-50 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] touch-manipulation cursor-pointer ${
        isSubscribed ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"
      }`}
    >
      {isSubscribed ? <BellRing className="size-5" /> : <BellOff className="size-5 animate-pulse" />}
      {isSubscribed ? "알림 켜짐 (누르면 해제)" : "매일 무료뽑기 알림 켜기"}
    </button>
  );
}