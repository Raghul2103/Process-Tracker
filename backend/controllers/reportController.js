import Activity from "../models/Activity.js";

const parseDateOnly = (dateInput) => {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400);
      throw new Error("date query is required: YYYY-MM-DD");
    }

    const start = parseDateOnly(date);
    if (!start) {
      res.status(400);
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const activities = await Activity.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end }
    }).sort({ hourBlock: 1 });

    res.json({
      type: "daily",
      date: formatDate(start),
      totalHours: activities.length,
      activities
    });
  } catch (error) {
    next(error);
  }
};

const getWeeklyReport = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      res.status(400);
      throw new Error("start and end queries are required: YYYY-MM-DD");
    }

    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    if (!startDate || !endDate || startDate > endDate) {
      res.status(400);
      throw new Error("Invalid date range");
    }

    const endExclusive = new Date(endDate);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const activities = await Activity.find({
      userId: req.user.id,
      date: { $gte: startDate, $lt: endExclusive }
    }).sort({ date: 1, hourBlock: 1 });

    const grouped = activities.reduce((acc, activity) => {
      const key = formatDate(activity.date);
      if (!acc[key]) {
        acc[key] = { date: key, totalHours: 0, activities: [] };
      }
      acc[key].totalHours += 1;
      acc[key].activities.push(activity);
      return acc;
    }, {});

    const byDay = Object.values(grouped);
    const totalHours = byDay.reduce((sum, day) => sum + day.totalHours, 0);

    res.json({
      type: "weekly",
      start: formatDate(startDate),
      end: formatDate(endDate),
      totalHours,
      byDay
    });
  } catch (error) {
    next(error);
  }
};

const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const parsedMonth = Number.parseInt(month, 10);
    const parsedYear = Number.parseInt(year, 10);

    if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
      res.status(400);
      throw new Error("Valid month (1-12) and year are required");
    }

    const start = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
    const end = new Date(Date.UTC(parsedYear, parsedMonth, 1));

    const activities = await Activity.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end }
    }).sort({ date: 1, hourBlock: 1 });

    const byDayMap = activities.reduce((acc, activity) => {
      const key = formatDate(activity.date);
      if (!acc[key]) {
        acc[key] = { date: key, totalEntries: 0, aggregatedHours: 0, activities: [] };
      }
      acc[key].totalEntries += 1;
      acc[key].aggregatedHours += 1;
      acc[key].activities.push(activity);
      return acc;
    }, {});

    const byDay = Object.values(byDayMap);
    const totalEntries = byDay.reduce((sum, day) => sum + day.totalEntries, 0);
    const totalHours = byDay.reduce((sum, day) => sum + day.aggregatedHours, 0);

    res.json({
      type: "monthly",
      month: parsedMonth,
      year: parsedYear,
      totalEntries,
      totalHours,
      byDay
    });
  } catch (error) {
    next(error);
  }
};

export { getDailyReport, getWeeklyReport, getMonthlyReport };
