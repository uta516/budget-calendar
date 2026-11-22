export type EventForm = {
  title: string;
  /** "2026-11-20" */
  date: string;
  /** "19:00" */
  startTime: string;
  /** "21:00"。空なら終了なし */
  endTime: string;
  /** 入力欄の文字そのまま */
  amountText: string;
};

/** 保存できないときの注意の文。保存できるなら null */
export function checkEventForm(form: EventForm): string | null {
  if (form.title.trim() === "") return "タイトルを入れてください";
  if (!form.date) return "日付を選んでください";
  if (!form.startTime) return "開始の時刻を入れてください";
  // "HH:MM" どうしなので文字のまま比べられる
  if (form.endTime && form.endTime < form.startTime) {
    return "終了の時刻は開始より後にしてください";
  }
  const text = form.amountText.trim();
  if (text === "") return "予想金額を入れてください（0円以上）";
  if (text.startsWith("-")) return "予想金額はマイナスにできません（0円以上）";
  if (!/^\d+$/.test(text)) return "予想金額は数字だけで入れてください（円の整数）";
  return null;
}

/** 日本時間の日付と時刻 → ISO 形式 "2026-11-20T19:00:00+09:00" */
export function toJstIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}
