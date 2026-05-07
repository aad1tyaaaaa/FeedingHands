import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/feeding_hands";
    await mongoose.connect(mongoUri);
    console.log("Mongo connected");
  } catch (err) {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;