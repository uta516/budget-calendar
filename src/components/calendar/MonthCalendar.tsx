"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import jaLocale from "@fullcalendar/react/locales/ja";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import type { Event } from "@/lib/supabase";
import { kindStyle } from "./eventKinds";
import { jstDate } from "./dates";

type Props = {
  events: Event[];
  /** 選んでいる日 "2026-11-28" */
  selectedDate: string;
  onDateClick: (date: string) => void;
  /** 表示している月が変わったとき "2026-11" */
  onMonthChange: (month: string) => void;
};

// 月表示のカレンダー。予定は種類ごとの色の点で出す
export default function MonthCalendar({ events, selectedDate, onDateClick, onMonthChange }: Props) {
  const calendarEvents = [
    ...events.map((e) => ({
      id: String(e.id),
      title: e.title,
      start: jstDate(e.starts_at),
      allDay: true,
      color: kindStyle(e.kind).color,
    })),
    // 選んでいる日に色を付ける
    { start: selectedDate, allDay: true, display: "background", color: "#ccfbf1" },
  ];

  return (
    <div className="budget-calendar rounded-3xl bg-white p-3 text-sm shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, classicThemePlugin]}
        locale={jaLocale}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev", center: "title", right: "next" }}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates={false}
        dayMaxEvents={3}
        events={calendarEvents}
        eventContent={(info) => (
          <span
            className="mx-auto block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: info.color }}
            title={info.event.title}
          />
        )}
        dateClick={(info) => onDateClick(info.dateStr)}
        eventClick={(info) => {
          if (info.event.startStr) onDateClick(info.event.startStr.slice(0, 10));
        }}
        datesSet={(info) => {
          const start = info.view.currentStart;
          onMonthChange(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`);
        }}
      />
    </div>
  );
}
