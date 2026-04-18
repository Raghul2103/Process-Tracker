import { useEffect, useMemo, useState } from "react";
import ActivityForm from "../components/ActivityForm";
import ActivityList from "../components/ActivityList";
import Loader from "../components/Loader";
import { createActivity, deleteActivity, getActivities, updateActivity } from "../services/api";

const formatToday = () => new Date().toISOString().slice(0, 10);

const localCalendarYmd = () => {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const huesFromDateKey = (dateKey) => {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const base = Math.abs(hash) % 360;
  return {
    h1: base,
    h2: (base + 42) % 360,
    h3: (base + 84) % 360
  };
};

const Home = ({ showToast }) => {
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wallDateKey, setWallDateKey] = useState(localCalendarYmd);

  useEffect(() => {
    const syncDay = () => {
      const today = localCalendarYmd();
      setWallDateKey((prev) => (prev !== today ? today : prev));
    };
    const id = setInterval(syncDay, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") syncDay();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const dayTheme = useMemo(() => huesFromDateKey(wallDateKey), [wallDateKey]);

  const fetchActivities = async (date) => {
    setLoading(true);
    try {
      const response = await getActivities(date);
      setActivities(response);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to load activities", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(selectedDate);
  }, [selectedDate]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createActivity(payload);
      showToast("Activity added successfully", "success");
      fetchActivities(selectedDate);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to add activity", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteActivity(id);
      showToast("Activity deleted", "success");
      fetchActivities(selectedDate);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete activity", "error");
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await updateActivity(id, payload);
      showToast("Activity updated", "success");
      await fetchActivities(selectedDate);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to update activity", "error");
    }
  };

  const shellStyle = {
    background: `linear-gradient(145deg, hsl(${dayTheme.h1} 78% 94%) 0%, hsl(${dayTheme.h2} 72% 91%) 48%, hsl(${dayTheme.h3} 76% 93%) 100%)`,
    backgroundSize: "220% 220%",
    transition: "background 1.2s ease-in-out, background-position 1.2s ease-in-out"
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 shadow-card transition-[background,box-shadow] duration-1000 ease-in-out sm:p-6 md:rounded-3xl animate-homeShimmer"
      style={shellStyle}
    >
      <div
        className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl animate-homeOrbPulse"
        style={{ background: `hsl(${dayTheme.h1} 85% 72%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full opacity-35 blur-3xl animate-homeOrbDrift"
        style={{ background: `hsl(${dayTheme.h3} 80% 68%)` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/30" />
      <div className="relative z-10 space-y-4">
        <ActivityForm
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSubmit={handleCreate}
          loading={saving}
        />
        {loading ? (
          <Loader />
        ) : (
          <ActivityList activities={activities} onDelete={handleDelete} onUpdate={handleUpdate} loading={loading} />
        )}
      </div>
    </div>
  );
};

export default Home;
