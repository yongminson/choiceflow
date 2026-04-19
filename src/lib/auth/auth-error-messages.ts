/**
 * Supabase Auth 등에서 오는 영어 메시지를 한국어로 통일합니다.
 */
export function mapAuthErrorToKorean(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: string }).message ?? "")
      : err instanceof Error
        ? err.message
        : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower === "invalid email or password"
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (
    lower.includes("email rate limit") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    lower.includes("already registered") ||
    lower.includes("user already registered") ||
    lower.includes("email address is already registered")
  ) {
    return "이미 가입된 이메일입니다.";
  }

  return "일시적인 오류가 발생했습니다. 다시 시도해 주세요.";
}

export type LoginUrlAlert =
  | { kind: "info"; message: string }
  | { kind: "error"; message: string };

/**
 * 쿼리·해시에서 온 인증 관련 안내 (만료 링크 등).
 */
export function resolveLoginUrlAlert(opts: {
  errorParam: string | null;
  errorCodeParam: string | null;
  hashErrorCode: string | null;
  hashError: string | null;
}): LoginUrlAlert | null {
  const code = opts.errorCodeParam?.toLowerCase() ?? "";
  const hashCode = opts.hashErrorCode?.toLowerCase() ?? "";
  const errDecoded = opts.errorParam
    ? safeDecodeURIComponent(opts.errorParam)
    : "";
  const combined = `${code} ${hashCode} ${errDecoded} ${opts.hashError ?? ""}`.toLowerCase();

  const isExpiredOrInvalidLink =
    code === "otp_expired" ||
    hashCode === "otp_expired" ||
    combined.includes("otp_expired") ||
    errDecoded === "인증실패" ||
    errDecoded.includes("인증실패") ||
    combined.includes("expired") ||
    combined.includes("access_denied") ||
    code === "callback_failed" ||
    code === "missing_code" ||
    hashCode === "missing_code" ||
    hashCode === "callback_failed";

  if (isExpiredOrInvalidLink) {
    return {
      kind: "info",
      message:
        "이미 인증이 완료되었거나 만료된 링크입니다. 바로 로그인을 시도해 주세요.",
    };
  }

  if (opts.errorParam && errDecoded && !isExpiredOrInvalidLink) {
    return {
      kind: "error",
      message: mapRawQueryErrorToKorean(errDecoded),
    };
  }

  return null;
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function mapRawQueryErrorToKorean(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("인증실패") || lower.includes("expired")) {
    return "이미 인증이 완료되었거나 만료된 링크입니다. 바로 로그인을 시도해 주세요.";
  }
  return mapAuthErrorToKorean(new Error(raw));
}
