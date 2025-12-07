const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },

  // ✅ title & description from frontend
  title: { type: String },
  description: { type: String },

  contentType: { type: String },
  size: { type: Number },

  // ✅ file bytes
  data: { type: Buffer, required: true },

  // ✅ uploader email
  uploaderName: { type: String },

  // ✅ mark/unmark important
  isImportant: { type: Boolean, default: false },

  // ✅ any additional metadata
  meta: { type: Object },

  // ✅ list of emails the doc is shared with
  sharedWith: { type: [String], default: [] },

  createdAt: { type: Date, default: Date.now }
});

// helpful index for listing recent uploads
UploadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Upload", UploadSchema, "uploads");
