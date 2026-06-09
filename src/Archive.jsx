// Archive view — shows recent daily puzzles (last 30 days by default) with
// per-row completion status pulled from localStorage. Mobile-friendly, no
// server round-trip.

import { useEffect, useMemo, useState } from "react";
import { buildArchiveDates, getAllProgress, getStreak, getRecentCompletions, getTodayIsoDate, puzzleIndexForDate } from "./progress.js";
import { trackArchiveOpen, trackPuzzleFromArchive, trackPageView } from "./analytics.js";
import AdSlot from "./AdSlot.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "perfect", label: "Perfect" },
  { id: "unplayed", label: "Not played" }
];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusFor(entry) {
  if (!entry) return "not-played";
  if (entry.perfect) return "perfect";
  return "completed";
}

function statusLabel(status, locale) {
  if (status === "perfect") return locale === "zh" ? "完美" : "Perfect";
  if (status === "completed") return locale === "zh" ? "已完成" : "Completed";
  return locale === "zh" ? "未玩" : "Not played";
}

function statusClassName(status) {
  if (status === "perfect") return "archive-status archive-status--perfect";
  if (status === "completed") return "archive-status archive-status--completed";
  return "archive-status archive-status--none";
}

export default function Archive({ pool, onOpenPuzzle, locale = "en" }) {
  const [filter, setFilter] = useState("all");
  const [progress, setProgress] = useState(() => getAllProgress());
  const [streak, setStreak] = useState(() => getStreak());
  const [recent, setRecent] = useState(() => getRecentCompletions());
  const today = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    trackPageView("/archive");
    trackArchiveOpen(typeof location !== "undefined" ? location.pathname : "/");
  }, []);

  useEffect(() => {
    // Re-read on mount in case progress was just written on the game page.
    setProgress(getAllProgress());
    setStreak(getStreak());
    setRecent(getRecentCompletions());
  }, []);

  const dates = useMemo(() => buildArchiveDates(pool.length || 500, today), [today, pool.length]);

  const rows = useMemo(() => {
    return dates.map((date) => {
      const entry = progress[date];
      const status = statusFor(entry);
      const puzzleId = pool[puzzleIndexForDate(date, pool.length)]?.id ?? null;
      return { date, entry, status, puzzleId };
    });
  }, [dates, progress, pool]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "perfect") return rows.filter((row) => row.status === "perfect");
    if (filter === "completed") return rows.filter((row) => row.status === "completed" || row.status === "perfect");
    if (filter === "unplayed") return rows.filter((row) => row.status === "not-played");
    return rows;
  }, [rows, filter]);

  const handleOpen = (row) => {
    trackPuzzleFromArchive({ puzzleId: row.puzzleId, date: row.date });
    if (typeof onOpenPuzzle === "function") {
      onOpenPuzzle(row.date);
    } else if (typeof history !== "undefined") {
      history.pushState(null, "", `/puzzle/${row.date}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <section className="archive panel" aria-label="Puzzle archive">
      <header className="archive-head">
        <div>
          <h2>{locale === "zh" ? "题库历史" : "Puzzle Archive"}</h2>
          <p>
            {locale === "zh"
              ? "回顾过去 30 天的每日文字分类谜题，本地记录完成状态。"
              : "Play previous Nanami Cat daily word puzzles and track your progress."}
          </p>
        </div>
        <div className="archive-streak" aria-live="polite">
          <div>
            <span className="archive-streak__value">{streak.current}</span>
            <span className="archive-streak__label">
              {locale === "zh" ? "连续天数" : "Day streak"}
            </span>
          </div>
          <div>
            <span className="archive-streak__value">{recent.length}</span>
            <span className="archive-streak__label">
              {locale === "zh" ? "最近完成" : "Recent"}
            </span>
          </div>
        </div>
      </header>

      <nav className="archive-filters" aria-label={locale === "zh" ? "状态筛选" : "Filter"}>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="archive-table-wrap" role="region" aria-label={locale === "zh" ? "历史题目列表" : "Archive list"}>
        <table className="archive-table">
          <thead>
            <tr>
              <th scope="col">{locale === "zh" ? "日期" : "Date"}</th>
              <th scope="col">{locale === "zh" ? "题号" : "Puzzle"}</th>
              <th scope="col">{locale === "zh" ? "用时" : "Time"}</th>
              <th scope="col">{locale === "zh" ? "失误" : "Mistakes"}</th>
              <th scope="col">{locale === "zh" ? "状态" : "Status"}</th>
              <th scope="col"><span className="visually-hidden">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isToday = row.date === today;
              return (
                <tr key={row.date} className="archive-row">
                  <th scope="row">
                    <time dateTime={row.date}>{row.date}</time>
                    {isToday ? <span className="archive-today"> · {locale === "zh" ? "今天" : "today"}</span> : null}
                  </th>
                  <td>{row.puzzleId ? row.puzzleId.replace("text-", "#") : "—"}</td>
                  <td>{formatTime(row.entry?.timeSeconds)}</td>
                  <td>{row.entry?.mistakes ?? "—"}</td>
                  <td>
                    <span className={statusClassName(row.status)}>
                      {statusLabel(row.status, locale)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="archive-open"
                      onClick={() => handleOpen(row)}
                    >
                      {locale === "zh" ? "玩这题" : "Play"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="archive-empty">
                  {locale === "zh" ? "这个筛选下没有题目。" : "No puzzles match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdSlot slotName="ad-archive-bottom" reservedHeight={120} label="Ad" />
    </section>
  );
}
