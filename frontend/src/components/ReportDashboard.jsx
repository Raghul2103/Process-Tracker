import { useEffect, useMemo, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import ChartView from "./ChartView";

const TABS = ["daily", "weekly", "monthly"];

const formatToday = () => new Date().toISOString().slice(0, 10);

const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
};

/** Stable HSL gradient from a date string (daily tab only). */
const gradientStyleFromDate = (dateStr) => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 52) % 360;
  const h3 = (h1 + 104) % 360;
  return {
    background: `linear-gradient(125deg, hsl(${h1} 70% 42%) 0%, hsl(${h2} 64% 36%) 48%, hsl(${h3} 72% 34%) 100%)`
  };
};

const ReportDashboard = ({ reportType, setReportType, report, onGenerate, loading }) => {
  const week = getWeekBounds();
  const [filters, setFilters] = useState({
    date: formatToday(),
    start: week.start,
    end: week.end,
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear())
  });
  const [search, setSearch] = useState("");
  const [hourFilter, setHourFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const flattenedActivities = useMemo(() => {
    if (!report) return [];
    if (reportType === "daily") {
      return (report.activities || []).map((activity) => ({
        ...activity,
        reportDate: report.date
      }));
    }
    return (report.byDay || []).flatMap((day) =>
      (day.activities || []).map((activity) => ({
        ...activity,
        reportDate: day.date
      }))
    );
  }, [report, reportType]);

  const hourOptions = useMemo(() => {
    const uniqueHours = [...new Set(flattenedActivities.map((activity) => activity.hourBlock))];
    return uniqueHours.sort();
  }, [flattenedActivities]);

  const filteredActivities = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return flattenedActivities.filter((activity) => {
      const matchesHour = hourFilter === "all" || activity.hourBlock === hourFilter;
      const matchesSearch =
        !searchTerm ||
        activity.description.toLowerCase().includes(searchTerm) ||
        activity.hourBlock.toLowerCase().includes(searchTerm) ||
        activity.reportDate.includes(searchTerm);
      return matchesHour && matchesSearch;
    });
  }, [flattenedActivities, hourFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const barData = useMemo(() => {
    if (!report) return [];
    if (reportType === "daily") return [{ label: report.date, value: report.totalHours }];
    return (report.byDay || []).map((day) => ({
      label: day.date,
      value: day.totalHours || day.aggregatedHours || day.totalEntries || 0
    }));
  }, [report, reportType]);

  const pieData = useMemo(() => {
    if (!filteredActivities.length) return [];
    return filteredActivities.reduce((acc, item) => {
      const key = item.hourBlock;
      const existing = acc.find((entry) => entry.name === key);
      if (existing) existing.value += 1;
      else acc.push({ name: key, value: 1 });
      return acc;
    }, []);
  }, [filteredActivities]);

  const dailyHeroStyle = useMemo(() => {
    if (reportType !== "daily") return undefined;
    const dateKey = report?.date || filters.date;
    return gradientStyleFromDate(dateKey);
  }, [reportType, report?.date, filters.date]);

  const reportInsights = useMemo(() => {
    if (!report) return null;
    if (reportType === "daily") {
      const dateLabel = report.date;
      const d = new Date(`${report.date}T12:00:00.000Z`);
      const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      const uniqueSlots = new Set(flattenedActivities.map((a) => a.hourBlock)).size;
      const coveragePct = Math.min(100, Math.round((uniqueSlots / 24) * 100));
      const counts = {};
      flattenedActivities.forEach((a) => {
        counts[a.hourBlock] = (counts[a.hourBlock] || 0) + 1;
      });
      let busiestBlock = "—";
      let busiestCount = 0;
      Object.entries(counts).forEach(([block, c]) => {
        if (c > busiestCount) {
          busiestCount = c;
          busiestBlock = block;
        }
      });
      const descChars = flattenedActivities.reduce((sum, a) => sum + (a.description || "").length, 0);
      const wordCount = flattenedActivities.reduce((sum, a) => {
        const words = (a.description || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        return sum + words.length;
      }, 0);
      const sorted = [...flattenedActivities].sort((a, b) => a.hourBlock.localeCompare(b.hourBlock));
      return {
        kind: "daily",
        weekday,
        dateLabel,
        coveragePct,
        uniqueSlots,
        busiestBlock,
        busiestCount,
        descChars,
        wordCount,
        firstBlock: sorted[0]?.hourBlock ?? "—",
        lastBlock: sorted[sorted.length - 1]?.hourBlock ?? "—"
      };
    }
    if (reportType === "weekly") {
      const byDay = report.byDay || [];
      let peak = { date: "—", hours: 0 };
      byDay.forEach((day) => {
        const h = day.totalHours || 0;
        if (h > peak.hours) peak = { date: day.date, hours: h };
      });
      const activeDays = byDay.filter((day) => (day.totalHours || 0) > 0).length;
      const avgPerActive =
        activeDays > 0 ? ((report.totalHours || 0) / activeDays).toFixed(1) : "0.0";
      const quiet = [...byDay].sort((a, b) => (a.totalHours || 0) - (b.totalHours || 0))[0];
      return {
        kind: "weekly",
        rangeLabel: `${report.start} → ${report.end}`,
        peak,
        activeDays,
        avgPerActive,
        quietestDate: quiet?.date ?? "—",
        quietestHours: quiet?.totalHours ?? 0
      };
    }
    const byDay = report.byDay || [];
    let peak = { date: "—", entries: 0 };
    byDay.forEach((day) => {
      const e = day.totalEntries || 0;
      if (e > peak.entries) peak = { date: day.date, entries: e };
    });
    const activeDays = byDay.filter((day) => (day.totalEntries || 0) > 0).length;
    const avgPerActive =
      activeDays > 0 ? ((report.totalEntries || 0) / activeDays).toFixed(1) : "0.0";
    const monthName = new Date(Date.UTC(report.year, report.month - 1, 1)).toLocaleString("en-US", {
      month: "long",
      timeZone: "UTC"
    });
    return {
      kind: "monthly",
      monthName,
      year: report.year,
      peak,
      activeDays,
      avgPerActive,
      totalEntries: report.totalEntries ?? 0,
      totalHours: report.totalHours ?? 0
    };
  }, [report, reportType, flattenedActivities]);

  const resetPagination = () => setCurrentPage(1);

  const onSearchChange = (event) => {
    setSearch(event.target.value);
    resetPagination();
  };

  const onHourFilterChange = (event) => {
    setHourFilter(event.target.value);
    resetPagination();
  };

  const movePage = (delta) => {
    setCurrentPage((prev) => Math.min(totalPages, Math.max(1, prev + delta)));
  };

  const exportReportCsv = () => {
    if (!filteredActivities.length) return;
    const headers = ["Date", "Hour Block", "Description"];
    const rows = filteredActivities.map((activity) => [
      activity.reportDate,
      activity.hourBlock,
      `"${activity.description.replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReportJson = () => {
    if (!report) return;
    const payload = JSON.stringify(report, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReportPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(15);
    doc.text("Process Tracker — Report export", 14, y);
    y += 7;
    doc.setFontSize(10);
    let subtitle = "";
    if (reportType === "daily") subtitle = `Daily · ${report.date}`;
    else if (reportType === "weekly") subtitle = `Weekly · ${report.start} to ${report.end}`;
    else subtitle = `Monthly · ${report.month}/${report.year}`;
    doc.text(subtitle, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    if (reportInsights?.kind === "daily") {
      doc.text(
        `Day: ${reportInsights.weekday}, ${reportInsights.dateLabel}. You wrote notes for ${reportInsights.uniqueSlots} different hours (out of 24).`,
        14,
        y,
        { maxWidth: 182 }
      );
      y += 10;
      doc.text(
        `Earliest note: ${reportInsights.firstBlock}. Latest note: ${reportInsights.lastBlock}. Busiest hour: ${reportInsights.busiestBlock} (${reportInsights.busiestCount} update(s)). About ${reportInsights.wordCount} words in all notes.`,
        14,
        y,
        { maxWidth: 182 }
      );
      y += 10;
    } else if (reportInsights?.kind === "weekly") {
      doc.text(
        `Range: ${reportInsights.rangeLabel} | Active days: ${reportInsights.activeDays} | Avg h/day (active): ${reportInsights.avgPerActive} | Peak: ${reportInsights.peak.date} (${reportInsights.peak.hours} h)`,
        14,
        y,
        { maxWidth: 182 }
      );
      y += 12;
    } else if (reportInsights?.kind === "monthly") {
      doc.text(
        `${reportInsights.monthName} ${reportInsights.year} | Entries: ${reportInsights.totalEntries} | Hours: ${reportInsights.totalHours} | Active days: ${reportInsights.activeDays} | Avg entries/active day: ${reportInsights.avgPerActive}`,
        14,
        y,
        { maxWidth: 182 }
      );
      y += 12;
    }
    doc.setTextColor(0, 0, 0);
    const body =
      filteredActivities.length > 0
        ? filteredActivities.map((a) => [
            a.reportDate,
            a.hourBlock,
            (a.description || "").replace(/\s+/g, " ").trim().slice(0, 800)
          ])
        : [["—", "—", "No rows match current filters."]];
    autoTable(doc, {
      startY: y + 2,
      head: [["Date", "Hour block", "Description"]],
      body,
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 28 }, 2: { cellWidth: "auto" } }
    });
    doc.save(`${reportType}-process-tracker-report.pdf`);
  };

  const submitFilters = () => {
    if (reportType === "daily") onGenerate("daily", { date: filters.date });
    if (reportType === "weekly") onGenerate("weekly", { start: filters.start, end: filters.end });
    if (reportType === "monthly") onGenerate("monthly", { month: filters.month, year: filters.year });
    resetPagination();
  };

  return (
    <div className="space-y-4">
      <div
        className={`overflow-hidden rounded-xl p-5 text-white shadow-card sm:p-6 ${
          reportType !== "daily" ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" : ""
        }`}
        style={reportType === "daily" ? dailyHeroStyle : undefined}
      >
        <h2 className="text-xl font-bold">Report Center</h2>
        <p className="mt-1 text-sm text-white/90">
          Read back what you logged, filter it, and download a copy when you need it.
        </p>
        {reportType === "daily" && (
          <p className="mt-2 text-xs font-medium text-white/80">
            Daily view uses a calm color that changes with the date you pick.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setReportType(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                reportType === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reportType === "daily" && (
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          )}
          {reportType === "weekly" && (
            <>
              <input
                type="date"
                value={filters.start}
                onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={filters.end}
                onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </>
          )}
          {reportType === "monthly" && (
            <>
              <select
                value={filters.month}
                onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </>
          )}
          <button
            type="button"
            onClick={submitFilters}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {reportType === "daily" && reportInsights?.kind === "daily" ? (
              <>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours you logged</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">{report.totalHours || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Each row is one hour on your timeline.</p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes you saved</p>
                  <p className="mt-2 text-3xl font-bold text-violet-600">{flattenedActivities.length}</p>
                  <p className="mt-1 text-xs text-slate-500">How many updates you wrote that day.</p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This day</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{report.date}</p>
                  <p className="mt-1 text-xs text-slate-500">{reportInsights.weekday}</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hours</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">{report.totalHours || 0}</p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Entries</p>
                  <p className="mt-2 text-3xl font-bold text-violet-600">{flattenedActivities.length}</p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Days</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {new Set(flattenedActivities.map((item) => item.reportDate)).size}
                  </p>
                </div>
              </>
            )}
          </div>

          {reportInsights && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800">
                {reportInsights.kind === "daily" ? "Your day in simple words" : "Report summary"}
              </h3>
              {reportInsights.kind === "daily" && (
                <p className="mt-1 text-xs text-slate-600">
                  This is a plain-language recap of the same list below — useful when you just want the story of your
                  day.
                </p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportInsights.kind === "daily" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Which day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.weekday}</p>
                      <p className="text-xs text-slate-600">{reportInsights.dateLabel}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">How much of the day you filled in</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {reportInsights.uniqueSlots} hour{reportInsights.uniqueSlots === 1 ? "" : "s"} with a note
                      </p>
                      <p className="text-xs text-slate-600">
                        Out of 24 hours, you touched {reportInsights.uniqueSlots}. That is about{" "}
                        {reportInsights.coveragePct}% of the day if you think in one-hour boxes.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Where you wrote the most</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.busiestBlock}</p>
                      <p className="text-xs text-slate-600">
                        {reportInsights.busiestCount > 1
                          ? `${reportInsights.busiestCount} updates in that hour — more than any other hour.`
                          : reportInsights.uniqueSlots <= 1
                            ? "You only added notes in one hour on this day."
                            : "One update in that hour; other hours may each have one update too."}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Start and end of your notes</p>
                      <p className="mt-1 text-sm text-slate-800">
                        <span className="font-semibold">Earliest:</span> {reportInsights.firstBlock}
                      </p>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Latest:</span> {reportInsights.lastBlock}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">How much you wrote</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        About {reportInsights.wordCount} word{reportInsights.wordCount === 1 ? "" : "s"} in all notes
                      </p>
                      <p className="text-xs text-slate-600">
                        ({reportInsights.descChars} letters and spaces — only there if you care about length)
                      </p>
                    </div>
                  </>
                )}
                {reportInsights.kind === "weekly" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Week you are looking at</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.rangeLabel}</p>
                      <p className="text-xs text-slate-600">From first date through last date in this report.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Busiest day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.peak.date}</p>
                      <p className="text-xs text-slate-600">{reportInsights.peak.hours} logged hours that day.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Days you logged something</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.activeDays}</p>
                      <p className="text-xs text-slate-600">Count of days with at least one entry.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Typical active day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.avgPerActive} hours</p>
                      <p className="text-xs text-slate-600">Average on days where you did log work.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Lightest day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.quietestDate}</p>
                      <p className="text-xs text-slate-600">{reportInsights.quietestHours} hours logged that day.</p>
                    </div>
                  </>
                )}
                {reportInsights.kind === "monthly" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Month</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {reportInsights.monthName} {reportInsights.year}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Busiest calendar day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.peak.date}</p>
                      <p className="text-xs text-slate-600">{reportInsights.peak.entries} entries that day.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Days you logged something</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.activeDays}</p>
                      <p className="text-xs text-slate-600">Days in the month with at least one note.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Typical logging day</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{reportInsights.avgPerActive} entries</p>
                      <p className="text-xs text-slate-600">Average on days where you did add a note.</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Month totals</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {reportInsights.totalEntries} entries · {reportInsights.totalHours} hour slots counted
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 shadow-card">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <input
                type="text"
                value={search}
                onChange={onSearchChange}
                placeholder="Filter by date, hour, description..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 md:col-span-2 lg:col-span-2"
              />
              <select
                value={hourFilter}
                onChange={onHourFilterChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="all">All Hours</option>
                {hourOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={exportReportCsv}
                  className="min-w-[7rem] flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={exportReportJson}
                  className="min-w-[7rem] flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={exportReportPdf}
                  className="min-w-[7rem] flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Hour Block</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedActivities.length ? (
                    paginatedActivities.map((activity) => (
                      <tr key={`${activity._id}-${activity.reportDate}`}>
                        <td className="px-4 py-3 text-slate-600">{activity.reportDate}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            {activity.hourBlock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{activity.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-6 text-center text-slate-500">
                        No report rows match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => movePage(-1)}
                  disabled={currentPage === 1}
                  className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => movePage(1)}
                  disabled={currentPage === totalPages}
                  className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <ChartView barData={barData} pieData={pieData} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Generate a report to view insights.
        </div>
      )}
    </div>
  );
};

export default ReportDashboard;
