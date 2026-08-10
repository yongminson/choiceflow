import {
  Gift,
  HousePlug,
  KeyRound,
  Plane,
  Shirt,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

const FLOATING_CHOICES: Array<{
  label: string;
  icon: LucideIcon;
  className: string;
}> = [
  { label: "오늘의 메뉴", icon: Utensils, className: "choice-float--1" },
  { label: "마음에 남는 선물", icon: Gift, className: "choice-float--2" },
  { label: "오래 쓸 가전", icon: HousePlug, className: "choice-float--3" },
  { label: "나에게 맞는 옷", icon: Shirt, className: "choice-float--4" },
  { label: "다음 여행", icon: Plane, className: "choice-float--5" },
  { label: "큰 지출", icon: KeyRound, className: "choice-float--6" },
];

export function ChoiceMotionField() {
  return (
    <div className="choice-visual" aria-hidden>
      <div className="choice-visual__orbit" />
      <div className="choice-visual__disc">
        <Image
          src="/brand/hero-decision-object.png"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 310px, 560px"
          className="object-contain drop-shadow-[0_45px_55px_rgba(0,0,0,0.35)]"
        />
      </div>
      {FLOATING_CHOICES.map(({ label, icon: Icon, className }) => (
        <div key={label} className={`choice-float ${className}`}>
          <span className="choice-float__icon">
            <Icon className="size-4" />
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
