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

  // 현재 내 브라우저가 알림을 켜놨는지 실시간으로 확인
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setIsSubscribed(true);
      });
    });
  }, []);

  const handleToggle = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // 🔴 이미 켜져 있다면? -> 끈다!
      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // (참고: 진짜 완벽하게 하려면 DB에서도 삭제하는 API를 짜야하지만, 우선 브라우저 알림만 차단시킵니다)
        }
        setIsSubscribed(false);
        toast.info("알림이 해제되었습니다. 언제든 다시 켤 수 있어요! 🔕");
        return;
      }

      // 🟢 꺼져 있다면? -> 켠다!
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("알림이 차단되었습니다. 주소창 왼쪽 자물쇠를 눌러 알림을 '허용'으로 바꿔주세요!");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID Public Key가 없습니다.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 서버(DB)에 저장 요청
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?.id || null,
        }),
      });

      // 🔥 [핵심 추가] 여기서 DB 저장이 실패하면 진짜 에러를 뿜어냅니다!
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "서버 DB 저장에 실패했습니다.");
      }

      setIsSubscribed(true);
      toast.success("🎉 알림 켜기 완료! 매일 1크레딧을 배달해 드릴게요!");
      
    } catch (e: any) {
      console.error(e);
      toast.error(`오류 발생: ${e.message}`); // 어떤 에러인지 화면에 띄워줌
    }
  };

  // 브라우저가 지원 안 하면 아예 안 보임
  if (!isSupported) return null;

  // 🔥 상단바 귀여운 아이콘 모드 (사라지지 않고 색깔만 변함!)
  if (variant === "icon") {
    return (
      <button 
        onClick={handleToggle} 
        title={isSubscribed ? "알림 끄기" : "알림 켜기"}
        className="flex size-9 items-center justify-center rounded-full bg-indigo-50 shadow-sm transition-transform hover:scale-110 hover:bg-indigo-100 dark:bg-white/10"
      >
        {isSubscribed ? (
          <BellRing className="size-5 text-emerald-500" /> /* 켜졌을 땐 초록색 */
        ) : (
          <BellOff className="size-5 text-slate-400 animate-bounce" /> /* 꺼졌을 땐 튕기는 회색 */
        )}
      </button>
    );
  }

  // 모달창 큰 버튼 모드
  return (
    <button 
      onClick={handleToggle} 
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] ${
        isSubscribed ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"
      }`}
    >
      {isSubscribed ? <BellRing className="size-5" /> : <BellOff className="size-5 animate-pulse" />}
      {isSubscribed ? "알림 켜짐 (누르면 해제)" : "매일 무료뽑기 알림 켜기"}
    </button>
  );
}