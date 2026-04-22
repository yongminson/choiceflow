"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, Plus, X, Trophy } from "lucide-react";

export function FoodRoulette() {
  const [items, setItems] = useState<string[]>(["", ""]);
  const [result, setResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItem, setDisplayItem] = useState<string>("?");

  const handleAddItem = () => {
    if (items.length >= 8) return alert("최대 8개까지만 가능합니다!");
    setItems([...items, ""]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) return alert("최소 2개는 입력해야 합니다!");
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const spinRoulette = () => {
    const validItems = items.filter((i) => i.trim() !== "");
    if (validItems.length < 2) return alert("메뉴를 2개 이상 입력해주세요!");

    setIsSpinning(true);
    setResult(null);

    let count = 0;
    const maxCount = 20; // 룰렛 돌아가는 횟수
    const interval = setInterval(() => {
      setDisplayItem(validItems[Math.floor(Math.random() * validItems.length)]);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        const finalResult = validItems[Math.floor(Math.random() * validItems.length)];
        setDisplayItem(finalResult);
        setResult(finalResult);
        setIsSpinning(false);
      }
    }, 100); // 0.1초마다 텍스트 변경
  };

  return (
    <div className="mb-8 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 dark:border-primary/20 dark:bg-primary/10">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Dices className="size-6 text-primary" />
        <h3 className="font-display text-lg font-bold text-foreground">결정장애 무료 해결! 메뉴 룰렛</h3>
      </div>

      <div className="mx-auto max-w-sm space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`후보 ${index + 1} (ex: 짜장면)`}
              value={item}
              onChange={(e) => handleUpdateItem(index, e.target.value)}
              className="bg-white/70 dark:bg-black/30"
            />
            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-muted-foreground hover:text-red-500">
              <X className="size-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={handleAddItem} className="w-full border-dashed">
          <Plus className="mr-2 size-4" /> 후보 추가하기
        </Button>

        <div className="py-4 text-center">
          <div className="flex h-16 items-center justify-center rounded-xl bg-white text-2xl font-black text-primary shadow-inner dark:bg-black/40">
            {isSpinning ? <span className="animate-pulse">{displayItem}</span> : result ? <span className="flex items-center gap-2 text-green-500"><Trophy className="size-6" /> {result} 당첨!</span> : <span className="text-muted-foreground opacity-50">?</span>}
          </div>
        </div>

        <Button onClick={spinRoulette} disabled={isSpinning} className="h-12 w-full font-bold text-lg">
          {isSpinning ? "고민 중..." : "룰렛 돌리기!"}
        </Button>
      </div>
    </div>
  );
}