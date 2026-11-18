// AI に何を聞くか（計算・AI の担当）
// ※ いまは仮のプロンプト。計算担当が中身を直す前提で、データ・連携担当が置いた。
//
// 流れ（呼ぶ側：src/app/api/ai/advice/route.ts）
//   1. ホームのまとめ（HomeSummary）を toAdviceInput() で、AI に渡す形（AdviceInput）にする
//   2. buildAdvicePrompt() でプロンプトの文を作り、Gemini に渡す
//   3. Gemini は ADVICE_SCHEMA の形（{ "advice": "…" }）の JSON で答える
//   4. 呼ぶ側で advice の長さなどを確かめ、画面に返す
//
// AdviceInput の中身が同じなら、同じ日はアドバイスを使い回す（AI を呼ばない）。
// そのため、毎回変わる値（今の時刻など）は AdviceInput に入れないこと。

import type { HomeSummary } from "@/lib/summary";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** AI に渡すデータ（金額はすべて円の整数、日付は日本時間の "YYYY-MM-DD"） */
export type AdviceInput = {
  /** 今日と曜日 */
  today: string;
  weekday: string;
  /** 今週あと使えるお金（マイナスなら予算オーバー） */
  weekLeft: number;
  /** 今日の目安 */
  todayGuide: number;
  /** 月末までに予定で使う見込み（今日以降の予定の予想金額の合計と件数） */
  plannedUntilMonthEnd: { amount: number; count: number };
  /** 普段使いに回せるお金（今月あと − 予定で使う見込み） */
  dailyMoney: number;
  /** これからの予定（近い順に最大3件） */
  upcomingEvents: { date: string; weekday: string; title: string; kind: string; amount: number }[];
  /** 今週（月〜日）の日ごとの目安。過ぎた日の guide は null */
  weekDays: {
    date: string;
    weekday: string;
    guide: number | null;
    plannedAmount: number;
    eventCount: number;
  }[];
};

/** ホームのまとめから、AI に渡すデータを作る */
export function toAdviceInput(summary: HomeSummary): AdviceInput {
  return {
    today: summary.today,
    weekday: weekdayOf(summary.today),
    weekLeft: summary.weekLeft,
    todayGuide: summary.todayGuide,
    plannedUntilMonthEnd: summary.plannedUntilMonthEnd,
    dailyMoney: summary.dailyMoney,
    upcomingEvents: summary.upcomingEvents.map((e) => ({
      date: e.date,
      weekday: weekdayOf(e.date),
      title: e.title,
      kind: e.kind,
      amount: e.estimatedAmount,
    })),
    weekDays: summary.days.map((d) => ({
      date: d.date,
      weekday: d.weekday,
      guide: d.guide,
      plannedAmount: d.plannedAmount,
      eventCount: d.eventCount,
    })),
  };
}

/** アドバイスの長さの上限（文字）。これより長い答えは使わず、決まった文にする */
export const ADVICE_MAX_LENGTH = 100;

/** Gemini に返してほしい JSON の形：{ "advice": "…" } */
export const ADVICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    advice: {
      type: "STRING",
      description: "日本語のアドバイス。1〜2文、全体で80文字くらいまで",
    },
  },
  required: ["advice"],
};

/** Gemini の答えの形 */
export type AdviceResponse = { advice: string };

/** プロンプト（system＝AI の役割、prompt＝毎回の質問） */
export function buildAdvicePrompt(input: AdviceInput): { system: string; prompt: string } {
  const system = [
    "あなたは大学生向け家計簿アプリのアシスタントです。",
    "これからの予定を先読みして、使いすぎを防ぐ短いアドバイスを日本語で1〜2文で返してください。",
    "金額は「1,200円」のように円で書き、データに無い金額や予定を作らないでください。",
    "責めずに、前向きで具体的な言い方にしてください。",
  ].join("\n");

  const prompt = [
    "次のデータをもとに、今日のアドバイスを1つ作ってください。",
    "予定がある日の前は控えめに、予定の無い日は目安どおりに、という考え方でお願いします。",
    "",
    "```json",
    JSON.stringify(input, null, 2),
    "```",
  ].join("\n");

  return { system, prompt };
}
