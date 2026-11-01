const mongoose = require("mongoose");
const AWS = require("aws-sdk");

// Database connection
const connect = mongoose.connect("mongodb://127.0.0.1:27017/Login");

connect
  .then(() => {
    console.log("Database Connected Successfully");
  })
  .catch((err) => {
    console.error("Database Connection Error:", err);
  });

// Schema definition
const Loginschema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpiry: {
    type: Date,
    default: null,
  },
});

// Model definition
const collection = mongoose.model("users", Loginschema);

module.exports = { collection, mongoose };

// AWS SES Configuration
AWS.config.update({
  region: "us-east-1", // Replace with your AWS region
  accessKeyId: "your-access-key-id", // Replace with your AWS Access Key ID
  secretAccessKey: "your-secret-access-key", // Replace with your AWS Secret Access Key
});

module.exports.AWS = AWS;
