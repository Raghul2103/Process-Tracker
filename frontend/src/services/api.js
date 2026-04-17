import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export const createActivity = async (payload) => {
  const { data } = await api.post("/activities", payload);
  return data;
};

export const getActivities = async (date) => {
  const { data } = await api.get(`/activities?date=${date}`);
  return data;
};

export const updateActivity = async (id, payload) => {
  const { data } = await api.put(`/activities/${id}`, payload);
  return data;
};

export const deleteActivity = async (id) => {
  const { data } = await api.delete(`/activities/${id}`);
  return data;
};

export const getReports = async (type, params) => {
  const query = new URLSearchParams(params).toString();
  const { data } = await api.get(`/reports/${type}?${query}`);
  return data;
};

export default api;
