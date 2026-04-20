import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
      <Link href="/" className="flex items-center space-x-2 gap-2 mr-6">
          {/* 👇 여기에 예쁜 로고가 들어갑니다 */}
          <img src="/logo.png" alt="ChoiceFlow Logo" className="w-7 h-7 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">ChoiceFlow</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="hidden sm:inline">AI 선택 코치</span>
        </nav>
      </div>
    </header>
  );
}
