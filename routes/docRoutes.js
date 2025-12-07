// backend/routes/docsRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Upload = require("../models/Upload");

// GET /api/docs/:id → return metadata for DocumentView.jsx
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid document ID" });
    }

    // Return metadata only, do NOT return the binary data
    const doc = await Upload.findById(id).select("-data").exec();

    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Document not found" });
    }

    res.json({ ok: true, doc });
  } catch (err) {
    console.error("Get doc error:", err);
    res.status(500).json({ ok: false, msg: "Server error", error: err.message });
  }
});

module.exports = router;
