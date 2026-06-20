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
