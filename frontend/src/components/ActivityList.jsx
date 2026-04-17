import { useEffect, useMemo, useState } from "react";

const ActivityList = ({ activities, onDelete, onUpdate, loading }) => {
  const [editingId, setEditingId] = useState(null);
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [hourFilter, setHourFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const hourOptions = useMemo(() => {
    const uniqueHours = [...new Set(activities.map((activity) => activity.hourBlock))];
    return uniqueHours.sort();
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return activities.filter((activity) => {
      const matchesHour = hourFilter === "all" || activity.hourBlock === hourFilter;
      const matchesSearch =
        !searchTerm || activity.description.toLowerCase().includes(searchTerm) || activity.hourBlock.includes(searchTerm);
      return matchesHour && matchesSearch;
    });
  }, [activities, hourFilter, search]);

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

  const exportActivitiesCsv = () => {
    if (!filteredActivities.length) return;
    const headers = ["Date", "Hour Block", "Description"];
    const rows = filteredActivities.map((activity) => [
      activity.date.slice(0, 10),
      activity.hourBlock,
      `"${activity.description.replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activities-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (activity) => {
    setEditingId(activity._id);
    setDescription(activity.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDescription("");
  };

  const onFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPage(1);
  };

  const movePage = (delta) => {
    setCurrentPage((prev) => Math.min(totalPages, Math.max(1, prev + delta)));
  };

  const saveEdit = async (activity) => {
    await onUpdate(activity._id, {
      date: activity.date.slice(0, 10),
      hourBlock: activity.hourBlock,
      description
    });
    cancelEdit();
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity List</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {filteredActivities.length} entries
        </span>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          value={search}
          onChange={onFilterChange(setSearch)}
          placeholder="Search by description/hour..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
        />
        <select
          value={hourFilter}
          onChange={onFilterChange(setHourFilter)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="all">All Hours</option>
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportActivitiesCsv}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading activities...</p>
      ) : filteredActivities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          No activities match your filters.
        </p>
      ) : (
        <div className="space-y-3">
          {paginatedActivities.map((activity) => (
            <div
              key={activity._id}
              className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-blue-700">{activity.hourBlock}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(activity)}
                    className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(activity._id)}
                    className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingId === activity._id ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(activity)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">{activity.description}</p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
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
      )}
    </div>
  );
};

export default ActivityList;
