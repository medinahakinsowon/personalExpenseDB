import jwt from "jsonwebtoken";

/**
 * Signs a JWT containing the user's id. Kept short-lived enough to limit
 * damage if leaked, configurable via JWT_EXPIRES_IN.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export default generateToken;
