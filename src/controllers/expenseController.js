import { validationResult } from "express-validator";
import Expense from "../models/Expense.model.js";
import asyncHandler from "../utils/asyncHandler.js";

// Builds a Mongo filter object scoped to the logged-in user, from optional
// query params: category, startDate, endDate, search.
const buildFilter = (req) => {
  const filter = { user: req.user._id };

  if (req.query.category && req.query.category !== "All") {
    filter.category = req.query.category;
  }

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      // include the entire end day
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (req.query.search) {
    filter.title = { $regex: req.query.search, $options: "i" };
  }

  return filter;
};

// @route  GET /api/expenses
// @access Private
export const getExpenses = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const sortField = ["date", "amount", "category"].includes(req.query.sortBy)
    ? req.query.sortBy
    : "date";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit),
    Expense.countDocuments(filter),
  ]);

  res.json({
    expenses,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  });
});

// @route  GET /api/expenses/:id
// @access Private
export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  res.json(expense);
});

// @route  POST /api/expenses
// @access Private
export const createExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { title, amount, category, date, notes, paymentMethod } = req.body;

  const expense = await Expense.create({
    user: req.user._id,
    title,
    amount,
    category,
    date,
    notes,
    paymentMethod,
  });

  res.status(201).json(expense);
});

// @route  PUT /api/expenses/:id
// @access Private
export const updateExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }

  const { title, amount, category, date, notes, paymentMethod } = req.body;
  if (title !== undefined) expense.title = title;
  if (amount !== undefined) expense.amount = amount;
  if (category !== undefined) expense.category = category;
  if (date !== undefined) expense.date = date;
  if (notes !== undefined) expense.notes = notes;
  if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;

  await expense.save();
  res.json(expense);
});

// @route  DELETE /api/expenses/:id
// @access Private
export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  res.json({ message: "Expense deleted", id: req.params.id });
});

// @route  GET /api/expenses/summary
// @access Private
// Returns aggregated data shaped for the dashboard charts: spending over
// time (by month) and a breakdown by category, both respecting the same
// date/category filters as the list view.
export const getSummary = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);

  const [byCategory, byMonth, totals] = await Promise.all([
    Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avg: { $avg: "$amount" },
        },
      },
    ]),
  ]);

  res.json({
    byCategory: byCategory.map((c) => ({
      category: c._id,
      total: c.total,
      count: c.count,
    })),
    byMonth: byMonth.map((m) => ({
      label: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
      total: m.total,
    })),
    totals: totals[0] || { total: 0, count: 0, avg: 0 },
  });
});

// @route  GET /api/expenses/export
// @access Private
// Streams the filtered expenses back as a downloadable CSV file.
export const exportExpensesCSV = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const expenses = await Expense.find(filter).sort({ date: -1 });

  const header = [
    "Date",
    "Title",
    "Category",
    "Amount",
    "Payment Method",
    "Notes",
  ];
  const escapeCSV = (value) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = expenses.map((e) =>
    [
      e.date.toISOString().slice(0, 10),
      e.title,
      e.category,
      e.amount.toFixed(2),
      e.paymentMethod,
      e.notes || "",
    ]
      .map(escapeCSV)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});
