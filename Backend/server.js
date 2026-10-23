const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();

// Middleware
app.use(cors());

app.use(express.json());

// Test route
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


// Handle unexpected errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
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
      console.error(
        `Error fetching ${config.table}:`,
        error.message
      );

      res.status(500).json({
        success: false,
        message: `Failed to fetch ${endpoint}`,
      });
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
