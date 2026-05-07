import jwt from "jsonwebtoken";

export default function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      role: user.role,
      phone: user.phone || null,
      email: user.email || null,
    },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "7d" }
  );
}
