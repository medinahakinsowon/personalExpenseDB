import { validationResult } from "express-validator";
import User from "../models/User.model.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  POST /api/auth/register
// @access Public
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(409)
      .json({ message: "An account with that email already exists" });
  }

  const user = await User.create({ name, email, password });

  res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
    },
    token: generateToken(user._id),
  });
});

// @route  POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;

  // select password explicitly since the schema excludes it by default
  const user = await User.findOne({ email }).select("+password");

  // Use a generic message for both "no user" and "wrong password" so we
  // don't leak which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
    },
    token: generateToken(user._id),
  });
});

// @route  GET /api/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      currency: req.user.currency,
    },
  });
});

// @route  POST /api/auth/forgot-password
// @access Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return the same response whether or not the email exists,
  // so we don't leak which emails are registered.
  if (!user) {
    return res.json({
      message: "If that email is registered, a reset link has been generated.",
    });
  }

  // Generate a secure random token
  const crypto = await import("crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await user.save();

  // In dev mode we return the link directly instead of emailing it.
  // In production, swap this out for a real email send.
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

  res.json({
    message: "If that email is registered, a reset link has been generated.",
    // DEV ONLY — remove this field before going to production
    devResetUrl: resetUrl,
  });
});

// @route  POST /api/auth/reset-password/:token
// @access Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  // Hash the incoming raw token to compare against the stored hash
  const crypto = await import("crypto");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }, // not expired
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    return res
      .status(400)
      .json({ message: "Reset link is invalid or has expired." });
  }

  // Set new password and clear the reset token
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    message:
      "Password reset successful. You can now sign in with your new password.",
  });
});
