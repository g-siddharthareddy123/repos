// routes/uploads.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const Upload = require("../models/Upload");
const auth = require("../middleware/auth"); // optional, not used here

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
});

// helper
function ensureDbConnected(res) {
  if (mongoose.connection.readyState !== 1) {
    res
      .status(503)
      .json({ ok: false, msg: "Database not connected. Try again later." });
    return false;
  }
  return true;
}

/* ========= POST /api/uploads ========= */
router.post("/", /*auth,*/ upload.single("file"), async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: "No file provided" });
    }

    const { description, authorEmail, title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, msg: "Title is required" });
    }

    const uploaderEmail =
      (req.user && req.user.email) || (authorEmail && authorEmail.trim());

    const fileDoc = new Upload({
      filename: req.file.originalname,
      title: title.trim(),
      description: description || "",
      contentType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploaderName: uploaderEmail || undefined,
      sharedWith: [],
    });

    await fileDoc.save();

    res.json({
      ok: true,
      msg: "File uploaded to uploads collection",
      id: fileDoc._id,
      filename: fileDoc.filename,
      title: fileDoc.title,
      size: fileDoc.size,
      contentType: fileDoc.contentType,
      createdAt: fileDoc.createdAt,
      uploaderName: fileDoc.uploaderName,
    });
  } catch (err) {
    console.error("Upload error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ ok: false, msg: "File too large" });
    }
    res.status(500).json({
      ok: false,
      msg: "Upload failed",
      error: err.message,
    });
  }
});

/* ========= GET /api/uploads ========= */
router.get("/", /*auth,*/ async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const authorEmail =
      (req.user && req.user.email) || req.query.authorEmail;

    let filter = {};
    if (authorEmail) {
      filter = {
        $or: [{ uploaderName: authorEmail }, { sharedWith: authorEmail }],
      };
    }

    const list = await Upload.find(filter)
      .select(
        "filename title description size contentType uploaderName createdAt meta sharedWith isImportant"
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    res.json({ ok: true, list });
  } catch (err) {
    console.error("List uploads error:", err);
    res.status(500).json({
      ok: false,
      msg: "Failed to list uploads",
      error: err.message,
    });
  }
});

/* ========= POST /api/uploads/:id/share ========= */
router.post("/:id/share", /*auth,*/ async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const { id } = req.params;
    const { email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid id" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ ok: false, msg: "Email is required" });
    }

    const doc = await Upload.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Document not found" });
    }

    // if you want only owner to share, add auth + check here

    doc.sharedWith.addToSet(email.trim());
    await doc.save();

    res.json({
      ok: true,
      msg: "Document shared successfully",
      sharedWith: doc.sharedWith,
    });
  } catch (err) {
    console.error("Share error:", err);
    res.status(500).json({
      ok: false,
      msg: "Failed to share document",
      error: err.message,
    });
  }
});
/* ========= PATCH /api/uploads/:id (edit title/description) ========= */
router.patch("/:id", async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const { id } = req.params;
    const { title, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid id" });
    }

    const update = {};
    if (typeof title === "string" && title.trim()) {
      update.title = title.trim();
    }
    if (typeof description === "string") {
      update.description = description;
    }

    const doc = await Upload.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).exec();

    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Not found" });
    }

    res.json({ ok: true, msg: "Updated", doc });
  } catch (err) {
    console.error("Edit upload error:", err);
    res.status(500).json({
      ok: false,
      msg: "Edit failed",
      error: err.message,
    });
  }
});

router.patch("/:id/important", async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const { id } = req.params;
    const { isImportant } = req.body;

    // ✅ validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "Invalid document id",
      });
    }

    // ✅ validate isImportant
    if (typeof isImportant !== "boolean") {
      return res.status(400).json({
        ok: false,
        msg: "isImportant must be a boolean (true/false)",
      });
    }

    const doc = await Upload.findById(id).exec();

    if (!doc) {
      return res.status(404).json({
        ok: false,
        msg: "Document not found",
      });
    }

    /* ✅ OPTIONAL: owner-only marking (HIGHLY RECOMMENDED)
    const currentUserEmail = req.user?.email || null;
    if (!currentUserEmail || doc.uploaderName !== currentUserEmail) {
      return res.status(403).json({
        ok: false,
        msg: "Only the owner can mark this document as important",
      });
    }
    */

    // ✅ update flag
    doc.isImportant = isImportant;
    await doc.save();

    res.json({
      ok: true,
      msg: "Important flag updated",
      isImportant: doc.isImportant,
      id: doc._id,
    });
  } catch (err) {
    console.error("Mark important error:", err);
    res.status(500).json({
      ok: false,
      msg: "Failed to update important flag",
      error: err.message,
    });
  }
});


/* ========= GET /api/uploads/:id (download) ========= */
router.get("/:id", async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid id" });
    }

    const doc = await Upload.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "File not found" });
    }

    res.set({
      "Content-Type": doc.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
    });
    return res.send(doc.data);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({
      ok: false,
      msg: "Download failed",
      error: err.message,
    });
  }
});

/* ========= GET /api/uploads/:id/meta ========= */
router.get("/:id/meta", async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid id" });
    }

    const meta = await Upload.findById(id).select("-data").exec();
    if (!meta) {
      return res.status(404).json({ ok: false, msg: "Not found" });
    }
    res.json({ ok: true, meta });
  } catch (err) {
    console.error("Meta error:", err);
    res.status(500).json({
      ok: false,
      msg: "Failed to get metadata",
      error: err.message,
    });
  }
});

/* ========= DELETE /api/uploads/:id ========= */
router.delete("/:id", /*auth,*/ async (req, res) => {
  try {
    if (!ensureDbConnected(res)) return;

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: "Invalid id" });
    }

    const doc = await Upload.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Not found" });
    }

    // if you want only owner to delete, add auth + check here

    await Upload.findByIdAndDelete(id).exec();

    res.json({ ok: true, msg: "Deleted", id: doc._id });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      ok: false,
      msg: "Delete failed",
      error: err.message,
    });
  }
});

module.exports = router;
