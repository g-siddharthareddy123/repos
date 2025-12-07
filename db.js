// db.js
const mongoose = require("mongoose");
require("dotenv").config(); // Load .env variables

// Get MongoDB URL from .env
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL, {
    // No need for old deprecated options
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

const db = mongoose.connection;
const Users = db.collection("users");

module.exports = { mongoose, db, Users };
