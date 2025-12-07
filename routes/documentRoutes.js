const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../utils/fileHandler');
const Document = require('../models/Document');
const User = require('../models/User');



// list (public + own; admin sees all)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const docs = await Document.find().populate('uploader', 'name email').sort({ createdAt: -1 });
      return res.json(docs);
    }
    const docs = await Document.find({
      $or: [
        { status: 'accepted', visibility: 'public' },
        { uploader: req.user._id }
      ]
    }).populate('uploader', 'name email').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// get one
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate('uploader', 'name email');
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    if (doc.visibility !== 'public' && req.user.role !== 'admin' && !doc.uploader._id.equals(req.user._id)) {
      return res.json({ needPassword: !!doc.passwordToOpen, message: 'Protected' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// open with password
router.post('/:id/open', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const doc = await Document.findById(req.params.id).populate('uploader', 'name email');
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    if (!doc.passwordToOpen) return res.json(doc);
    if (doc.passwordToOpen === password) return res.json(doc);
    return res.status(403).json({ msg: 'Wrong password' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    doc.comments.push({ user: req.user._id, text: req.body.text });
    await doc.save();
    const populated = await Document.findById(doc._id).populate('comments.user', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// download
router.get('/:id/download', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    if (doc.visibility !== 'public' && req.user.role !== 'admin' && !doc.uploader.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const path = require('path');
    return res.download(path.join(__dirname, '..', doc.filePath));
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
