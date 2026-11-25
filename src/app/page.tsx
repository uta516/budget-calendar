"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHomeSummary, type HomeSummary } from "@/lib/summary";
import { autoSyncCalendar, getEvents, type Event } from "@/lib/supabase";
import { jstDate } from "@/components/calendar/dates";
import { getAdvice, type AdviceResult } from "@/lib/ai/advice";
import AdviceCard from "@/components/home/AdviceCard";
import LogoutButton from "@/components/LogoutButton";
import HomeHeader from "@/components/home/HomeHeader";
import WeekMoneyCard from "@/components/home/WeekMoneyCard";
import MonthOutlook from "@/components/home/MonthOutlook";
import DailyGuideChart from "@/components/home/DailyGuideChart";
import RecordButton from "@/components/home/RecordButton";

/**
 * 今週（summary.days の月曜〜日曜）に始まる予定を読む。
 * 月をまたぐ週は2つの月を読む。読めなかったら null（予定名が出ないだけで、目安は出る）
 */
async function loadWeekEvents(summary: HomeSummary): Promise<Event[] | null> {
  const dates = new Set(summary.days.map((d) => d.date));
  const months = [...new Set(summary.days.map((d) => d.date.slice(0, 7)))];
  try {
    const lists = await Promise.all(months.map((m) => getEvents(m)));
    return lists.flat().filter((e) => dates.has(jstDate(e.starts_at)));
  } catch {
    return null;
  }
}

export default function Home() {
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  /** 今週の予定（日ごとの目安に予定名を出すため） */
  const [weekEvents, setWeekEvents] = useState<Event[] | null>(null);
  /** 画面が閉じたあとに届いた答えを使わないための目印 */
  const visible = useRef(false);

  const load = useCallback(() => {
    getHomeSummary()
      .then((summary) => {
        setHome(summary);
        setError(null);
        loadWeekEvents(summary).then((events) => {
          if (visible.current) setWeekEvents(events);
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    visible.current = true;
    load();
    // ホームを開いたらカレンダーを自動同期し、予定が変わったら数字を読み直す
    autoSyncCalendar().then((result) => {
      if (result.error) {
        setSyncError(
          result.needsRelogin
            ? "Googleカレンダーと同期できませんでした。ログインし直してください。"
            : result.error,
        );
      } else if (result.added + result.updated + result.deleted > 0) {
        load();
      }
      // 先読みアドバイスは、同期で予定が変わったあとのデータで作ってもらうため、同期のあとに1回だけ呼ぶ
      // （AI の作り直しは1日10回までなので、同期の前後で2回呼ばない）。Error は投げない
      getAdvice().then((r) => {
        if (visible.current) setAdvice(r);
      });
    });
    return () => {
      visible.current = false;
    };
  }, [load]);

  const todayGuide = home?.days.find((d) => d.isToday);

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!home && !error && (
          <p className="py-20 text-center text-sm text-zinc-500">読み込み中…</p>
        )}

        {home && (
          <div className="space-y-4">
            <HomeHeader today={home.today} weekday={todayGuide?.weekday ?? ""} />

            {syncError && (
              <p className="rounded-2xl bg-orange-50 p-3 text-xs text-orange-700">{syncError}</p>
            )}

            <WeekMoneyCard
              weekLeft={home.weekLeft}
              todayGuide={home.todayGuide}
              weekSpent={home.weekSpent}
              weekBudget={home.weekBudget}
              weekStart={home.days[0].date}
              weekEnd={home.days[home.days.length - 1].date}
            />
            <AdviceCard result={advice} />
            <MonthOutlook
              monthLeft={home.monthLeft}
              plannedAmount={home.plannedUntilMonthEnd.amount}
              plannedCount={home.plannedUntilMonthEnd.count}
              dailyMoney={home.dailyMoney}
            />
            <DailyGuideChart days={home.days} events={weekEvents} />

            {/* 設定画面ができるまで、ログアウトはここに置いておく */}
            <div className="flex justify-center pt-2">
              <LogoutButton />
            </div>
          </div>
        )}
      </main>

      <RecordButton />
    </div>
  );
}
