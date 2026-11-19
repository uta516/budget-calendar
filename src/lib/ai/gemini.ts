// Gemini API を呼ぶ共通の関数（サーバー専用。データ・連携の担当）
// "server-only" により、ブラウザ側のコードから import すると build エラーになる（API キーを守るため）
import "server-only";

/** GEMINI_MODEL が無いときに使うモデル（2026-11 時点で使える軽いモデル） */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** 1回の呼び出しの制限時間 */
const TIMEOUT_MS = 10_000;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiErrorKind =
  | "no-key" // GEMINI_API_KEY が無い
  | "timeout" // 10秒を超えた
  | "http" // Gemini がエラーを返した（回数の上限・鍵の誤りなど）
  | "blocked" // 安全フィルターなどで答えが出なかった
  | "empty" // 答えが空だった
  | "parse"; // JSON として読めなかった

export class GeminiError extends Error {
  constructor(
    public readonly kind: GeminiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export type GeminiOptions = {
  /** AI の役割など、毎回同じ前置き */
  system?: string;
  /** 0〜2。小さいほど毎回同じような答えになる */
  temperature?: number;
  /** 答えの長さの上限（トークン） */
  maxOutputTokens?: number;
};

/**
 * JSON で返してほしい形（Gemini の responseSchema。OpenAPI の書き方の一部）
 * 例：{ type: "OBJECT", properties: { advice: { type: "STRING" } }, required: ["advice"] }
 */
export type GeminiSchema = Record<string, unknown>;

/** 使うモデル名（GEMINI_MODEL があればそれ） */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/** GEMINI_API_KEY が設定されているか */
export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

async function callGemini(
  prompt: string,
  options: GeminiOptions,
  json?: GeminiSchema,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new GeminiError("no-key", "GEMINI_API_KEY が設定されていません");
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(options.system
      ? { systemInstruction: { parts: [{ text: options.system }] } }
      : {}),
    generationConfig: {
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      ...(json ? { responseMimeType: "application/json", responseSchema: json } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(geminiModel())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new GeminiError("timeout", `Gemini が${TIMEOUT_MS / 1000}秒以内に答えませんでした`);
    }
    throw new GeminiError("http", `Gemini に接続できませんでした：${(e as Error).message}`);
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    error?: { status?: string; message?: string };
  } | null;

  if (!res.ok) {
    // 鍵の値などは含めず、状態だけを返す
    throw new GeminiError(
      "http",
      `Gemini がエラーを返しました（${res.status} ${data?.error?.status ?? ""}）`,
      res.status,
    );
  }
  if (data?.promptFeedback?.blockReason) {
    throw new GeminiError("blocked", `答えが止められました（${data.promptFeedback.blockReason}）`);
  }
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) {
    throw new GeminiError("empty", `答えが空でした（${candidate?.finishReason ?? "理由不明"}）`);
  }
  return text;
}

/** 文章で答えをもらう */
export async function generateText(prompt: string, options: GeminiOptions = {}): Promise<string> {
  return callGemini(prompt, options);
}

/** JSON で答えをもらう。schema で形を指定する（中身の細かいチェックは呼ぶ側で行う） */
export async function generateJson<T>(
  prompt: string,
  schema: GeminiSchema,
  options: GeminiOptions = {},
): Promise<T> {
  const text = await callGemini(prompt, options, schema);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("parse", "答えを JSON として読めませんでした");
  }
}
