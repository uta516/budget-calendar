"use client";

import { useCallback, useEffect, useState } from "react";
import { getHomeSummary, type HomeSummary } from "@/lib/summary";
import { autoSyncCalendar } from "@/lib/supabase";
import LogoutButton from "@/components/LogoutButton";
import HomeHeader from "@/components/home/HomeHeader";
import WeekMoneyCard from "@/components/home/WeekMoneyCard";
import MonthOutlook from "@/components/home/MonthOutlook";
import DailyGuideChart from "@/components/home/DailyGuideChart";
import RecordButton from "@/components/home/RecordButton";

export default function Home() {
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = useCallback(() => {
    getHomeSummary()
      .then((summary) => {
        setHome(summary);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
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
    });
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
            <MonthOutlook
              monthLeft={home.monthLeft}
              plannedAmount={home.plannedUntilMonthEnd.amount}
              plannedCount={home.plannedUntilMonthEnd.count}
              dailyMoney={home.dailyMoney}
            />
            <DailyGuideChart days={home.days} />

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
