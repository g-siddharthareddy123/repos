const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: String,
  message: String,
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  notifications: [NotificationSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
