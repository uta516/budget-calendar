import { assertYen, fail, getSupabase, getUserId } from "./helpers";

export type Settings = {
  /** 時給（円の整数） */
  hourlyWage: number;
  /** 深夜の倍率（1.25 など。金額ではないので小数あり） */
  nightRate: number;
  /** 休日手当（円の整数） */
  holidayBonus: number;
};

/** まだ保存していないときの初期値（DB の default と同じ） */
export const DEFAULT_SETTINGS: Settings = {
  hourlyWage: 1100,
  nightRate: 1.25,
  holidayBonus: 0,
};

/** 自分の設定。まだ保存していなければ初期値を返す */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .maybeSingle();
  if (error) fail("設定の読み込みに失敗しました", error);
  if (!data) return { ...DEFAULT_SETTINGS };
  return {
    hourlyWage: data.hourly_wage,
    nightRate: data.night_rate,
    holidayBonus: data.holiday_bonus,
  };
}

/** 設定を保存する（無ければ作成、あれば更新） */
export async function saveSettings({
  hourlyWage,
  nightRate,
  holidayBonus,
}: Settings): Promise<Settings> {
  assertYen(hourlyWage, "時給");
  assertYen(holidayBonus, "休日手当");
  if (!Number.isFinite(nightRate) || nightRate < 1) {
    throw new Error("深夜の倍率は1以上の数で入力してください");
  }
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("settings")
    .upsert(
      {
        user_id: userId,
        hourly_wage: hourlyWage,
        night_rate: nightRate,
        holiday_bonus: holidayBonus,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) fail("設定の保存に失敗しました", error);
  return {
    hourlyWage: data.hourly_wage,
    nightRate: data.night_rate,
    holidayBonus: data.holiday_bonus,
  };
}
