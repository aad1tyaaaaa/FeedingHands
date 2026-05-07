import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";

function makeOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export const signup = async (req, res) => {
  try {
    const { phone, email, password, fullName, role } = req.body;
    if ((!phone && !email) || !password || !fullName) {
      return res.status(400).json({ message: "fullName, password and phone/email are required" });
    }

    const existing = await User.findOne({
      $or: [{ phone: phone || "__none__" }, { email: email || "__none__" }],
    });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = makeOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      fullName,
      phone,
      email,
      password: hashedPassword,
      role: role || "pending",
      otpCode,
      otpExpiresAt,
      isVerified: false,
    });

    return res.status(201).json({
      message: "Signup successful. Verify OTP to activate account.",
      userId: user._id,
      otp: process.env.NODE_ENV === "production" ? undefined : otpCode,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, email, token } = req.body;
    if ((!phone && !email) || !token) {
      return res.status(400).json({ message: "token and phone/email are required" });
    }

    const user = await User.findOne({
      $or: [{ phone: phone || "__none__" }, { email: email || "__none__" }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.otpCode || user.otpCode !== token || (user.otpExpiresAt && user.otpExpiresAt < new Date())) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    const access_token = generateToken(user);
    return res.json({ message: "OTP verified", access_token, user: { id: user._id, fullName: user.fullName } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const signin = async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    if ((!phone && !email) || !password) {
      return res.status(400).json({ message: "phone/email and password are required" });
    }

    const user = await User.findOne({
      $or: [{ phone: phone || "__none__" }, { email: email || "__none__" }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify OTP first" });
    }

    const access_token = generateToken(user);
    return res.json({
      message: "Signin successful",
      access_token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["donor", "volunteer", "organization"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Role must be donor, volunteer, or organization" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    const access_token = generateToken(user);
    return res.json({
      message: "Role updated successfully",
      access_token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const me = async (req, res) => {
  try {
    const payload = jwt.verify(
      (req.headers.authorization || "").replace("Bearer ", ""),
      process.env.JWT_SECRET || "dev-secret-change-me"
    );
    const user = await User.findById(payload.sub).select("-password -otpCode -otpExpiresAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (_err) {
    return res.status(401).json({ message: "Invalid auth token" });
  }
};