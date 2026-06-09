import { useEffect, useMemo, useState } from "react";
import { buildArchiveDates, getAllProgress, getStreak, getRecentCompletions, getTodayIsoDate, puzzleIndexForDate } from "./progress.js";
import { trackArchiveOpen, trackPuzzleFromArchive, trackPageView } from "./analytics.js";
import AdSlot from "./AdSlot.jsx";

function getFilters(locale) {
  return [
    { id: "all",       label: locale === "zh" ? "全部"   : locale === "ja" ? "すべて"   : "All" },
    { id: "completed", label: locale === "zh" ? "已通关" : locale === "ja" ? "クリア済み" : "Completed" },
    { id: "perfect",   label: locale === "zh" ? "完美"   : locale === "ja" ? "パーフェクト" : "Perfect" },
    { id: "failed",    label: locale === "zh" ? "失败"   : locale === "ja" ? "失敗"     : "Failed" },
    { id: "unplayed",  label: locale === "zh" ? "未玩"   : locale === "ja" ? "未プレイ"  : "Not played" }
  ];
}

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
  if (entry.completed) return "completed";
  if (entry.failed) return "failed";
  return "not-played";
}

function statusLabel(status, locale) {
  if (status === "perfect") {
    return locale === "zh" ? "完美" : locale === "ja" ? "パーフェクト" : "Perfect";
  }
  if (status === "completed") {
    return locale === "zh" ? "已通关" : locale === "ja" ? "クリア済み" : "Completed";
  }
  if (status === "failed") {
    return locale === "zh" ? "失败" : locale === "ja" ? "失敗" : "Failed";
  }
  return locale === "zh" ? "未玩" : locale === "ja" ? "未プレイ" : "Not played";
}

function statusClassName(status) {
  if (status === "perfect") return "archive-status archive-status--perfect";
  if (status === "completed") return "archive-status archive-status--completed";
  if (status === "failed") return "archive-status archive-status--failed";
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

  const filters = useMemo(() => getFilters(locale), [locale]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "perfect") return rows.filter((row) => row.status === "perfect");
    if (filter === "completed") return rows.filter((row) => row.status === "completed" || row.status === "perfect");
    if (filter === "failed") return rows.filter((row) => row.status === "failed");
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

  const t = {
    title:       locale === "zh" ? "题库历史"          : locale === "ja" ? "問題履歴"              : "Puzzle Archive",
    desc:        locale === "zh" ? "浏览全部历史题目，本地记录完成状态。" : locale === "ja" ? "過去の問題を振り返り、完了状態をローカルで確認できます。" : "Browse all past Nanami Cat puzzles and track your progress.",
    streakLabel: locale === "zh" ? "连续天数"           : locale === "ja" ? "連続日数"              : "Day streak",
    recentLabel: locale === "zh" ? "最近完成"           : locale === "ja" ? "最近のクリア"           : "Recent",
    filterAriaLabel: locale === "zh" ? "状态筛选"       : locale === "ja" ? "フィルター"            : "Filter",
    listAriaLabel:   locale === "zh" ? "历史题目列表"    : locale === "ja" ? "問題履歴リスト"         : "Archive list",
    colDate:     locale === "zh" ? "日期"              : locale === "ja" ? "日付"                  : "Date",
    colPuzzle:   locale === "zh" ? "题号"              : locale === "ja" ? "問題番号"               : "Puzzle",
    colTime:     locale === "zh" ? "用时"              : locale === "ja" ? "タイム"                : "Time",
    colMistakes: locale === "zh" ? "失误"              : locale === "ja" ? "ミス"                  : "Mistakes",
    colStatus:   locale === "zh" ? "状态"              : locale === "ja" ? "ステータス"             : "Status",
    todayLabel:  locale === "zh" ? "今天"              : locale === "ja" ? "今日"                  : "today",
    playBtn:     locale === "zh" ? "玩这题"             : locale === "ja" ? "プレイ"                : "Play",
    empty:       locale === "zh" ? "这个筛选下没有题目。" : locale === "ja" ? "この条件に合う問題はありません。" : "No puzzles match this filter."
  };

  return (
    <section className="archive panel" aria-label={t.title}>
      <header className="archive-head">
        <div>
          <h2>{t.title}</h2>
          <p>{t.desc}</p>
        </div>
        <div className="archive-streak" aria-live="polite">
          <div>
            <span className="archive-streak__value">{streak.current}</span>
            <span className="archive-streak__label">{t.streakLabel}</span>
          </div>
          <div>
            <span className="archive-streak__value">{recent.length}</span>
            <span className="archive-streak__label">{t.recentLabel}</span>
          </div>
        </div>
      </header>

      <nav className="archive-filters" aria-label={t.filterAriaLabel}>
        {filters.map((item) => (
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

      <div className="archive-table-wrap" role="region" aria-label={t.listAriaLabel}>
        <table className="archive-table">
          <thead>
            <tr>
              <th scope="col">{t.colDate}</th>
              <th scope="col">{t.colPuzzle}</th>
              <th scope="col">{t.colTime}</th>
              <th scope="col">{t.colMistakes}</th>
              <th scope="col">{t.colStatus}</th>
              <th scope="col"><span className="visually-hidden">{t.playBtn}</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isToday = row.date === today;
              return (
                <tr key={row.date} className="archive-row">
                  <th scope="row">
                    <time dateTime={row.date}>{row.date}</time>
                    {isToday ? <span className="archive-today"> · {t.todayLabel}</span> : null}
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
                      {t.playBtn}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="archive-empty">
                  {t.empty}
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
