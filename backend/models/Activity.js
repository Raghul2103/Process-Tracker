import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: "demo-user"
    },
    date: {
      type: Date,
      required: [true, "Date is required"]
    },
    hourBlock: {
      type: String,
      required: [true, "Hour block is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ date: 1, hourBlock: 1, userId: 1 }, { unique: true });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
