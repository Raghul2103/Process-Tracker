import { useMemo, useState } from "react";

const buildHourOptions = () =>
  Array.from({ length: 24 }, (_, hour) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String((hour + 1) % 24).padStart(2, "0")}:00`;
    return `${start}-${end}`;
  });

const ActivityForm = ({ selectedDate, onDateChange, onSubmit, loading }) => {
  const hourOptions = useMemo(() => buildHourOptions(), []);
  const [formData, setFormData] = useState({
    hourBlock: hourOptions[0],
    description: ""
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      date: selectedDate,
      hourBlock: formData.hourBlock,
      description: formData.description
    });
    setFormData((prev) => ({ ...prev, description: "" }));
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-card sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">Log Activity</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Hour Block</span>
            <select
              value={formData.hourBlock}
              onChange={(e) => setFormData((prev) => ({ ...prev, hourBlock: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500"
            >
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Description</span>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500"
            placeholder="What did you work on in this hour?"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Activity"}
        </button>
      </form>
    </div>
  );
};

export default ActivityForm;
