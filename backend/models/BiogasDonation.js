import mongoose from "mongoose";

const biogasDonationSchema = new mongoose.Schema(
  {
    food_type: { type: String, required: true, trim: true },
    quantity: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    contact_number: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("BiogasDonation", biogasDonationSchema);
