import { useEffect, useState } from "react";
import ActivityForm from "../components/ActivityForm";
import ActivityList from "../components/ActivityList";
import Loader from "../components/Loader";
import { createActivity, deleteActivity, getActivities, updateActivity } from "../services/api";

const formatToday = () => new Date().toISOString().slice(0, 10);

const Home = ({ showToast }) => {
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-4">
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
  );
};

export default Home;
