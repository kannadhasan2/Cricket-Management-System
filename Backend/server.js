const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors("http://localhost:5000"));
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Backend server is running!",
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});