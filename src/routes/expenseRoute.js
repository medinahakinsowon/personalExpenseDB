import express from "express";
import { body } from "express-validator";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getSummary,
  exportExpensesCSV,
} from "../controllers/expenseController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { EXPENSE_CATEGORIES } from "../models/Expense.model.js";

const router = express.Router();

// Every route below requires a valid logged-in user
router.use(protect);

const expenseValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),
  body("category")
    .optional()
    .isIn(EXPENSE_CATEGORIES)
    .withMessage("Invalid category"),
  body("date").optional().isISO8601().withMessage("Date must be a valid date"),
];

router.get("/summary", getSummary);
router.get("/export", exportExpensesCSV);
router.get("/meta/categories", (req, res) =>
  res.json({ categories: EXPENSE_CATEGORIES }),
);

router.get("/", getExpenses);
router.post("/", expenseValidation, createExpense);

router.get("/:id", getExpenseById);
router.put("/:id", expenseValidation, updateExpense);
router.delete("/:id", deleteExpense);

export default router;
