import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "로그인",
  description: "ChoiceFlow 계정으로 로그인하거나 새로 가입합니다.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center px-4 py-16">
      <LoginForm />
    </div>
  );
}
