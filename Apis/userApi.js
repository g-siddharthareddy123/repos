// Apis/userApi.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Get Users collection from db.js
const { Users } = require("../db");

// Small helper to prefix logs from this file
const log = (...args) => console.log("[userApi]", ...args);

// ✅ Simple test route to check API is mounted
router.get("/ping", (req, res) => {
  log("Received /user/ping request");
  res.json({ status: "ok", message: "userApi is working" });
});

router.post("/register", async (req, res) => {
  try {
    console.log("🔥 POST /auth/register called");
    console.log("👉 Request body:", req.body);

    const { name, email, password } = req.body;

    // ✅ Validation
    if (!name || !email || !password) {
      console.log("⚠️ Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if user already exists
    const existingUser = await Users.findOne({ email });
    console.log("🔍 Existing user check:", existingUser);

    if (existingUser) {
      console.log("❌ User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("🔐 Password hashed");

    // ✅ Create user document
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: "user",
      createdAt: new Date(),
    };

    const result = await Users.insertOne(newUser);

    console.log("✅ User registered:", result.insertedId);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.insertedId,
        name,
        email,
        role: "user",
      },
    });
  } catch (error) {
    console.error("💥 Error in /auth/register:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// POST: Login
router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body || {};

    if (!email || !password) {
      log("Missing email or password in request body");
      return res.status(400).json({ message: "Email and password are required" });
    }

    log("Login attempt for email:", email);

    // 3. Find user in DB
    const userDoc = await Users.findOne({ email });

    if (!userDoc) {
      log("No user found in DB with this email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    log("User found in DB:", {
      _id: userDoc._id,
      email: userDoc.email,
      role: userDoc.role,
    });

    // 4. Compare password
    if (!userDoc.password) {
      log("User document has no password field!", userDoc);
      return res.status(500).json({ message: "User data invalid on server" });
    }

    const isMatch = await bcrypt.compare(password, userDoc.password);
    log("Password match result:", isMatch);

    if (!isMatch) {
      log("Password mismatch for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 5. Check JWT secret
    if (!process.env.JWT_SECRET) {
      log("⚠️ JWT_SECRET is NOT set in environment variables");
      // For dev only you can fallback (not recommended in production)
      // process.env.JWT_SECRET = "dev_secret_key";
    }

    // 6. Generate token
    const tokenPayload = { id: userDoc._id, role: userDoc.role };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || "dev_secret", {
      expiresIn: "7d",
    });

    log("JWT token generated for user:", userDoc.email);

    // 7. Send response
    const responseUser = {
      id: userDoc._id,
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
    };

    log("Sending success response for email:", email);
    return res.json({
      message: "Login successful",
      token,
      user: responseUser,
    });
  } catch (error) {
    log("❌ Error in /user/login:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
