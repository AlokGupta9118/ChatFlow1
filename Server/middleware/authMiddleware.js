// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import Users from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ 1. Check token in cookies first
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // ✅ 2. Fallback to Bearer header if cookie not found
    else if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ❌ If still no token — block access
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user and attach to req
    const user = await Users.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Session expired, please log in again"
          : "Not authorized, token failed",
    });
  }
};
