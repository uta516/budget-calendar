// 予定の追加・変更・削除で、Google の呼び出しに時間切れを付ける（サーバー専用）
// ログイン直後の同期（/auth/callback の8秒）と同じ考え方。
// vitest から読めるように、"@/" を使わずに書く

/** 決めていないときの制限時間（ミリ秒） */
export const DEFAULT_CALENDAR_WRITE_TIMEOUT_MS = 8000;

/**
 * 制限時間（ミリ秒）。.env.local の CALENDAR_WRITE_TIMEOUT_MS で変えられる（確認のために 1 にする、など）。
 * 無いか、1以上の整数でなければ 8000
 */
export function calendarWriteTimeoutMs(
  value: string | undefined = process.env.CALENDAR_WRITE_TIMEOUT_MS,
): number {
  const ms = Number(value);
  return value && Number.isInteger(ms) && ms > 0 ? ms : DEFAULT_CALENDAR_WRITE_TIMEOUT_MS;
}

/** Google の呼び出しが制限時間を超えた */
export class GoogleTimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Google の呼び出しが制限時間（${ms}ms）を超えました`);
  }
}

/**
 * fn(signal) を呼び、ms ミリ秒たっても終わらなければ signal を打ち切って GoogleTimeoutError を投げる。
 * 返事を待つのは Promise.race なので、signal を見ない処理が混じっていても ms で必ず戻る。
 * fn のエラー（時間切れの前）は、そのまま上に伝わる
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new GoogleTimeoutError(ms);
      reject(error); // 先に時間切れで終わらせてから、
      controller.abort(error); // 呼び出し中の fetch などを打ち切る
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
