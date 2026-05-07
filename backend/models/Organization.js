import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    contact: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    contactNumber: { type: String, trim: true },
    latitude: Number,
    longitude: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Organization", organizationSchema);
