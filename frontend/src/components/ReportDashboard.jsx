import { useEffect, useMemo, useState } from "react";
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

  const submitFilters = () => {
    if (reportType === "daily") onGenerate("daily", { date: filters.date });
    if (reportType === "weekly") onGenerate("weekly", { start: filters.start, end: filters.end });
    if (reportType === "monthly") onGenerate("monthly", { month: filters.month, year: filters.year });
    resetPagination();
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 text-white shadow-card sm:p-6">
        <h2 className="text-xl font-bold">Report Center</h2>
        <p className="mt-1 text-sm text-blue-100">
          Analyze productivity with filtered insights, pagination, and one-click exports.
        </p>
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
              <p className="mt-2 text-3xl font-bold text-emerald-600">{new Set(flattenedActivities.map((item) => item.reportDate)).size}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-card">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="text"
                value={search}
                onChange={onSearchChange}
                placeholder="Filter by date, hour, description..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 md:col-span-2"
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportReportCsv}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={exportReportJson}
                  className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Export JSON
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
