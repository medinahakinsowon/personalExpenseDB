import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.model.js";
import Expense, { EXPENSE_CATEGORIES } from "./src/models/Expense.model.js";
import mongoose from "mongoose";

dotenv.config();

// --- Configurable test user -------------------------------------------------
const TEST_USER = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "SuperSecret123",
  currency: "USD",
};

// --- Sample expenses ---------------------------------------------------------
// Spread across the last ~3 months and several categories so charts/filters
// have something meaningful to show.
const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Mobile Money",
  "Other",
];

const SAMPLE_EXPENSES = [
  {
    title: "Groceries at the market",
    amount: 45.99,
    category: "Food & Dining",
    daysAgo: 2,
    paymentMethod: "Card",
  },
  {
    title: "Uber to airport",
    amount: 23.5,
    category: "Transportation",
    daysAgo: 5,
    paymentMethod: "Mobile Money",
  },
  {
    title: "Netflix subscription",
    amount: 15.99,
    category: "Entertainment",
    daysAgo: 10,
    paymentMethod: "Card",
  },
  {
    title: "Electric bill",
    amount: 88.2,
    category: "Utilities",
    daysAgo: 15,
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Doctor visit copay",
    amount: 30,
    category: "Healthcare",
    daysAgo: 18,
    paymentMethod: "Cash",
  },
  {
    title: "Rent",
    amount: 950,
    category: "Housing",
    daysAgo: 20,
    paymentMethod: "Bank Transfer",
  },
  {
    title: "New running shoes",
    amount: 72.4,
    category: "Shopping",
    daysAgo: 22,
    paymentMethod: "Card",
  },
  {
    title: "Online course",
    amount: 49.99,
    category: "Education",
    daysAgo: 28,
    paymentMethod: "Card",
  },
  {
    title: "Weekend trip to the coast",
    amount: 210,
    category: "Travel",
    daysAgo: 33,
    paymentMethod: "Card",
  },
  {
    title: "Index fund top-up",
    amount: 300,
    category: "Savings & Investments",
    daysAgo: 35,
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Coffee with a friend",
    amount: 8.5,
    category: "Food & Dining",
    daysAgo: 40,
    paymentMethod: "Cash",
  },
  {
    title: "Gym membership",
    amount: 35,
    category: "Healthcare",
    daysAgo: 45,
    paymentMethod: "Card",
  },
  {
    title: "Phone bill",
    amount: 28.75,
    category: "Utilities",
    daysAgo: 48,
    paymentMethod: "Mobile Money",
  },
  {
    title: "Movie night",
    amount: 18,
    category: "Entertainment",
    daysAgo: 52,
    paymentMethod: "Cash",
  },
  {
    title: "Bus pass",
    amount: 40,
    category: "Transportation",
    daysAgo: 58,
    paymentMethod: "Card",
  },
  {
    title: "Birthday gift",
    amount: 60,
    category: "Shopping",
    daysAgo: 63,
    paymentMethod: "Card",
  },
  {
    title: "Textbooks",
    amount: 120,
    category: "Education",
    daysAgo: 70,
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Car repair",
    amount: 175.3,
    category: "Transportation",
    daysAgo: 75,
    paymentMethod: "Card",
  },
  {
    title: "Streaming bundle",
    amount: 22.99,
    category: "Entertainment",
    daysAgo: 80,
    paymentMethod: "Card",
  },
  {
    title: "Misc household items",
    amount: 33.4,
    category: "Other",
    daysAgo: 85,
    paymentMethod: "Cash",
  },
];

const daysAgoToDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const seed = async () => {
  await connectDB();

  try {
    console.log("Clearing existing seed data for test user...");
    const existing = await User.findOne({ email: TEST_USER.email });
    if (existing) {
      await Expense.deleteMany({ user: existing._id });
      await User.deleteOne({ _id: existing._id });
    }

    console.log(`Creating test user: ${TEST_USER.email}`);
    // Password is hashed automatically by the User model's pre-save hook
    const user = await User.create(TEST_USER);

    console.log(`Seeding ${SAMPLE_EXPENSES.length} expenses...`);
    const docs = SAMPLE_EXPENSES.map((e) => ({
      user: user._id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: daysAgoToDate(e.daysAgo),
      paymentMethod: e.paymentMethod,
    }));
    await Expense.insertMany(docs);

    console.log("\nSeed complete.");
    console.log("----------------------------------------");
    console.log(`Login email:    ${TEST_USER.email}`);
    console.log(`Login password: ${TEST_USER.password}`);
    console.log(`Expenses created: ${docs.length}`);
    console.log(
      `Categories used: ${[...new Set(docs.map((d) => d.category))].join(", ")}`,
    );
    console.log("----------------------------------------");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

seed();
