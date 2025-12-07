const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  date: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filePath: String,
  fileName: String,
  mimeType: String,
  size: Number,
  visibility: { type: String, enum: ['public','private','hidden'], default: 'public' },
  passwordToOpen: String,
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  isImportant: { type: Boolean, default: false },
  comments: [CommentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
