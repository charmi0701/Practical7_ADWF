require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const auth = require("./middleware/auth");
const User = require("./models/User");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Request logging middleware for lab visibility
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root & Health routes
app.get("/", (_req, res) => {
  res.json({
    message: "Practical 7: Authentication & Middleware Pipeline API is running",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me (or GET /me) [Protected]",
      tasks: "ALL /api/tasks (or /tasks) [Protected]"
    }
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Direct /me endpoint as requested in lab manual supplementary problems
app.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Task routes (supported at both /tasks and /api/tasks)
app.use("/api/tasks", taskRoutes);
app.use("/tasks", taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Centralized error handling middleware
app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Mongoose validation failed",
      details: Object.values(error.errors).map((item) => item.message)
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ error: "Invalid resource ID format" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "Duplicate key error: value already exists" });
  }
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  res.status(500).json({ error: "Internal server error", message: error.message });
});

// MongoDB Connection and Server Startup
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/practical7_taskdb";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully at:", MONGO_URI);
    app.listen(port, () => {
      console.log(`Practical 7 Server listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = app;
