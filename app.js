import express from "express";
import cors from "cors";
import morgan from "morgan"
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoute.js";
import expenseRoutes from "./src/routes/expenseRoute.js";
import { notFound, errorHandler } from "./src/middlewares/errorMiddleware.js";

dotenv.config();

await connectDB();

const app = express();




app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("/{*path}", cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));



// CORS: only allow the configured frontend origin(s) to call this API
// const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
//   .split(",")
//   .map((o) => o.trim());
// app.use(
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//   }),
// );



app.use(express.json({ limit: "100kb" }));

// Security headers
// app.use(helmet());

// Throttle auth endpoints to slow down credential-stuffing / brute force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
