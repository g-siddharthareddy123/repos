const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Document = require('../models/Document');
const User = require('../models/User');

// pending
router.get('/pending', auth, admin, async (req, res) => {
  const pending = await Document.find({ status: 'pending' }).populate('uploader', 'name email');
  res.json(pending);
});

// change status / important
router.post('/document/:id/status', auth, admin, async (req, res) => {
  const { status, isImportant } = req.body;
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ msg: 'Not found' });
  if (status) doc.status = status;
  if (typeof isImportant !== 'undefined') doc.isImportant = !!isImportant;
  await doc.save();

  // notify uploader
  const user = await User.findById(doc.uploader);
  user.notifications.push({ type: 'status_change', message: `Your document "${doc.title}" was ${doc.status}` });
  await user.save();

  res.json(doc);
});

// summary
router.get('/summary', auth, admin, async (req, res) => {
  const total = await Document.countDocuments();
  const pending = await Document.countDocuments({ status: 'pending' });
  const accepted = await Document.countDocuments({ status: 'accepted' });
  res.json({ total, pending, accepted });
});

module.exports = router;
