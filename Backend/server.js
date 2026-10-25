const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const pool = require("./db");

const app = express();

// ───────────── Config ─────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

// If you deploy behind a proxy (Render, Railway, Vercel...), uncomment so rate limiting sees real IPs:
// app.set("trust proxy", 1);

// ───────────── Middleware ─────────────
app.use(cors());
app.use(express.json());

// ───────────── Test routes ─────────────
app.get("/", (req, res) => {
  res.json({
    message: "Backend server is running!",
  });
});

// Test Supabase PostgreSQL connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    res.json({
      message: "Supabase database connected successfully!",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// ───────────── Auth ─────────────
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // keeps login timing uniform

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Try again in a few minutes." },
});

// Use on any route that should need a signed-in user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Please sign in first." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

// POST /api/auth/register  { username, password }
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== "string" || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      return res.status(400).json({
        message: "Username must be 3–30 letters, numbers, dots, dashes or underscores.",
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      "INSERT INTO public.users (username, password_hash) VALUES ($1, $2)",
      [username.trim(), passwordHash]
    );

    res.status(201).json({ message: "Account created. You can sign in now." });
  } catch (error) {
    if (error.code === "23505") {
      // unique_violation
      return res.status(409).json({ message: "That username is already taken." });
    }
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Could not create the account." });
  }
});

// POST /api/auth/login  { username, password, remember }
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { username, password, remember } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const result = await pool.query(
      "SELECT user_id, username, password_hash, role FROM public.users WHERE username = $1",
      [username.trim()]
    );
    const user = result.rows[0];

    // Always run bcrypt so response time doesn't reveal whether the username exists
    const passwordOk = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH
    );

    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Wrong username or password." });
    }

    const token = jwt.sign(
      { sub: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: remember ? "30d" : "8h" }
    );

    res.json({
      token,
      user: { id: user.user_id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Could not sign you in. Please try again." });
  }
});

// GET /api/auth/me  (header: Authorization: Bearer <token>)
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.sub, username: req.user.username, role: req.user.role },
  });
});

// ───────────── Cricket tables ─────────────
const tables = {
  persons: {
    table: "person",
    primaryKey: "person_id",
  },
  owners: {
    table: "owner",
    primaryKey: "owner_id",
  },
  sponsors: {
    table: "sponsor",
    primaryKey: "sponsor_id",
  },
  venues: {
    table: "venue",
    primaryKey: "venue_id",
  },
  teams: {
    table: "team",
    primaryKey: "team_id",
  },
  players: {
    table: "player",
    primaryKey: "person_id",
  },
  coaches: {
    table: "coach",
    primaryKey: "person_id",
  },
  umpires: {
    table: "umpire",
    primaryKey: "person_id",
  },
  seasons: {
    table: "season",
    primaryKey: "season_id",
  },
  matches: {
    table: "cricket_match",
    primaryKey: "match_id",
  },
  "match-umpires": {
    table: "match_umpire",
    primaryKey: "match_umpire_id",
  },
  "team-sponsors": {
    table: "team_sponsor",
    primaryKey: "team_sponsor_id",
  },
  "auction-records": {
    table: "auction_record",
    primaryKey: "auction_id",
  },
  innings: {
    table: "innings",
    primaryKey: "innings_id",
  },
  "ball-by-ball": {
    table: "ball_by_ball",
    primaryKey: "ball_id",
  },
  performances: {
    table: "performance",
    primaryKey: "performance_id",
  },
};

// Register a GET endpoint for every table
// To make the data private, change to: app.get(`/api/${endpoint}`, requireAuth, async (req, res) => {
for (const [endpoint, config] of Object.entries(tables)) {
  app.get(`/api/${endpoint}`, async (req, res) => {
    try {
      const query = `
        SELECT *
        FROM public.${config.table}
        ORDER BY ${config.primaryKey} ASC
      `;
      const result = await pool.query(query);
      res.status(200).json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error(`Error fetching ${config.table}:`, error.message);

      res.status(500).json({
        success: false,
        message: `Failed to fetch ${endpoint}`,
      });
    }
  });
}

// ───────────── Errors (keep these after all routes) ─────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

// ───────────── Start server ─────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);