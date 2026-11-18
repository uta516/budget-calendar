// 画面から呼ぶ、先読みアドバイスの関数（データ・連携の担当）
// "use client" のコンポーネントから呼ぶ。AI の鍵はサーバー側だけで使う

/** 決まった文になった理由 */
export type AdviceFallbackReason =
  | "no-key" // サーバーに GEMINI_API_KEY が無い
  | "limit" // 今日の作り直しの回数（10回）を使い切った
  | "timeout" // AI が10秒以内に答えなかった
  | "error"; // AI の失敗・答えの形がおかしい・保存の失敗など

export type AdviceResult = {
  /** アドバイスの文（1〜2文）。取得そのものに失敗したときだけ null */
  advice: string | null;
  /** "ai"＝AIで作った、"fallback"＝決まった文。取得に失敗したときは null */
  source: "ai" | "fallback" | null;
  /** 決まった文になった理由 */
  reason?: AdviceFallbackReason;
  /** 今日すでに作ったアドバイスを使い回したか（データが変わっていないとき） */
  cached: boolean;
  /** 今日あと何回 AI で作り直せるか */
  remainingToday: number | null;
  /** 取得そのものに失敗したときの日本語のメッセージ */
  error?: string;
  /** 再ログインが必要なとき true */
  needsRelogin?: boolean;
};

/**
 * 先読みアドバイスをもらう（ホーム画面を開いたときなど）。
 * 同じ日・同じデータなら、サーバーに保存したものを使い回す（AI を呼ばない）。
 * Error は投げず、失敗も戻り値で返す。
 */
export async function getAdvice(): Promise<AdviceResult> {
  const failed = (error: string, needsRelogin = false): AdviceResult => ({
    advice: null,
    source: null,
    cached: false,
    remainingToday: null,
    error,
    needsRelogin,
  });
  try {
    const res = await fetch("/api/ai/advice", { method: "POST" });
    const body = (await res.json().catch(() => null)) as
      | (Partial<AdviceResult> & { error?: string })
      | null;
    if (!res.ok || !body || typeof body.advice !== "string") {
      return failed(
        body?.error ?? "アドバイスの取得に失敗しました",
        body?.needsRelogin ?? res.status === 401,
      );
    }
    return {
      advice: body.advice,
      source: body.source ?? "fallback",
      reason: body.reason,
      cached: body.cached ?? false,
      remainingToday: body.remainingToday ?? null,
    };
  } catch {
    return failed("アドバイスの取得に失敗しました（通信エラー）");
  }
}
