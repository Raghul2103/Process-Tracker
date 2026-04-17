import Activity from "../models/Activity.js";

const parseDateOnly = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const dayRange = (dateInput) => {
  const start = parseDateOnly(dateInput);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const createActivity = async (req, res, next) => {
  try {
    const { date, hourBlock, description } = req.body;

    if (!date || !hourBlock || !description) {
      res.status(400);
      throw new Error("date, hourBlock and description are required");
    }

    const normalizedDate = parseDateOnly(date);
    if (!normalizedDate) {
      res.status(400);
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    const activity = await Activity.create({
      userId: req.user.id,
      date: normalizedDate,
      hourBlock,
      description
    });

    res.status(201).json(activity);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("An activity already exists for this date and hour block"));
    }
    next(error);
  }
};

const getActivitiesByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const range = dayRange(date);

    if (!range) {
      res.status(400);
      throw new Error("Valid date query is required: YYYY-MM-DD");
    }

    const activities = await Activity.find({
      userId: req.user.id,
      date: { $gte: range.start, $lt: range.end }
    }).sort({ hourBlock: 1 });

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, hourBlock, description } = req.body;

    const activity = await Activity.findOne({ _id: id, userId: req.user.id });
    if (!activity) {
      res.status(404);
      throw new Error("Activity not found");
    }

    if (date) {
      const normalizedDate = parseDateOnly(date);
      if (!normalizedDate) {
        res.status(400);
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      }
      activity.date = normalizedDate;
    }

    if (hourBlock) activity.hourBlock = hourBlock;
    if (description) activity.description = description;

    const updated = await activity.save();
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("An activity already exists for this date and hour block"));
    }
    next(error);
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, userId: req.user.id });

    if (!activity) {
      res.status(404);
      throw new Error("Activity not found");
    }

    await activity.deleteOne();
    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export { createActivity, getActivitiesByDate, updateActivity, deleteActivity };
