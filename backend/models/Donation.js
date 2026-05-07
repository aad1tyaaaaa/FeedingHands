import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: "food" },
    location: { type: String, trim: true },
    latitude: Number,
    longitude: Number,
    contact: { type: String, trim: true },
    notes: { type: String, trim: true },
    foodDetails: { type: mongoose.Schema.Types.Mixed, default: "" },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    status: {
      type: String,
      enum: ["available", "requested", "picked_up", "in_transit", "delivered", "cancelled"],
      default: "available",
    },
    status2: { type: String, default: "Pending pickup" },
    donation_tracking_id: { type: String, unique: true, index: true },
    puniya_points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Donation", donationSchema);