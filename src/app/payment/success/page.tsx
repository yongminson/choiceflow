export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-foreground">
        결제 완료
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        이 페이지는 토스페이먼츠 결제 성공 후 리다이렉트용 뼈대입니다.
      </p>
    </div>
  );
}
