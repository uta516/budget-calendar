import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toJstDate } from "@/lib/supabase/month";
import { getHomeSummary } from "@/lib/summary";
import { generateJson, GeminiError, hasGeminiKey } from "@/lib/ai/gemini";
import {
  ADVICE_MAX_LENGTH,
  ADVICE_SCHEMA,
  buildAdvicePrompt,
  toAdviceInput,
  type AdviceInput,
  type AdviceResponse,
} from "@/lib/ai/prompts";
import { fallbackAdvice } from "@/lib/ai/fallback";
import type { AdviceFallbackReason, AdviceResult } from "@/lib/ai/advice";

/** AI での作り直しは、1人1日この回数まで（失敗した回も数える） */
const DAILY_AI_LIMIT = 10;

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message, needsRelogin: status === 401 }, { status });
}

/** AI に渡すデータの指紋。データが変わったら作り直すために使う */
function dataHash(input: AdviceInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/**
 * POST /api/ai/advice
 * その人のホームのまとめから、先読みアドバイス（1〜2文）を返す。
 * - 今日（日本時間）・同じデータなら、保存したアドバイスを使い回す（AI を呼ばない）
 * - データが変わったら AI で作り直す（1人1日10回まで。失敗も数える）
 * - AI が使えないときは、決まった文を返す（source: "fallback"）
 * 戻り値：AdviceResult（src/lib/ai/advice.ts）
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(401, "ログインしていません。もう一度ログインしてください");
  }

  const now = new Date();
  const today = toJstDate(now);

  let input: AdviceInput;
  try {
    input = toAdviceInput(await getHomeSummary(now, supabase));
  } catch (e) {
    console.error("[ai-advice] ホームのまとめの読み込みに失敗:", (e as Error).message);
    return errorResponse(500, "アドバイスに使うデータの読み込みに失敗しました");
  }
  const hash = dataHash(input);

  const fallback = (reason: AdviceFallbackReason, used: number): NextResponse => {
    const result: AdviceResult = {
      advice: fallbackAdvice(input),
      source: "fallback",
      reason,
      cached: false,
      remainingToday: Math.max(0, DAILY_AI_LIMIT - used),
    };
    return NextResponse.json(result);
  };

  // 今日の保存済みのアドバイス
  const { data: saved, error: readError } = await supabase
    .from("ai_advice")
    .select("advice, data_hash, ai_count")
    .eq("user_id", user.id)
    .eq("advice_date", today)
    .maybeSingle();
  if (readError) {
    // 回数を確かめられないときは、AI を呼ばない（使いすぎ防止）
    console.error("[ai-advice] ai_advice の読み込みに失敗:", readError.message);
    return fallback("error", DAILY_AI_LIMIT);
  }

  const used = saved?.ai_count ?? 0;
  if (saved?.advice && saved.data_hash === hash) {
    const result: AdviceResult = {
      advice: saved.advice,
      source: "ai",
      cached: true,
      remainingToday: Math.max(0, DAILY_AI_LIMIT - used),
    };
    return NextResponse.json(result);
  }

  if (!hasGeminiKey()) return fallback("no-key", used);
  if (used >= DAILY_AI_LIMIT) return fallback("limit", used);

  // AI を呼ぶ前に回数を数える（失敗した回も数える）。advice と data_hash はそのまま残る
  const { error: countError } = await supabase
    .from("ai_advice")
    .upsert(
      { user_id: user.id, advice_date: today, ai_count: used + 1, updated_at: now.toISOString() },
      { onConflict: "user_id,advice_date" },
    );
  if (countError) {
    console.error("[ai-advice] 回数の保存に失敗:", countError.message);
    return fallback("error", used);
  }

  try {
    const { system, prompt } = buildAdvicePrompt(input);
    const answer = await generateJson<AdviceResponse>(prompt, ADVICE_SCHEMA, {
      system,
      temperature: 0.4,
    });
    const advice = typeof answer?.advice === "string" ? answer.advice.trim() : "";
    if (!advice || advice.length > ADVICE_MAX_LENGTH) {
      console.error(`[ai-advice] 答えが空か長すぎます（${advice.length}文字）`);
      return fallback("error", used + 1);
    }

    const { error: saveError } = await supabase
      .from("ai_advice")
      .update({ advice, data_hash: hash, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("advice_date", today);
    if (saveError) {
      // 保存できなくても、今回のアドバイスは返す（次回また作り直しになる）
      console.error("[ai-advice] アドバイスの保存に失敗:", saveError.message);
    }

    const result: AdviceResult = {
      advice,
      source: "ai",
      cached: false,
      remainingToday: Math.max(0, DAILY_AI_LIMIT - (used + 1)),
    };
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      console.error(`[ai-advice] Gemini の失敗（${e.kind}）:`, e.message);
      return fallback(e.kind === "timeout" ? "timeout" : "error", used + 1);
    }
    console.error("[ai-advice] アドバイスの作成に失敗:", e);
    return fallback("error", used + 1);
  }
}
