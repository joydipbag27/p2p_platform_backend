import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metaData: {
      type: Object,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

export const Notification = mongoose.model("notification", notificationSchema);
