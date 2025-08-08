const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Word = require('../models/Word');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  try { req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'dev_secret_key'); next(); } catch(e){ return res.status(401).json({ success: false, message: 'Invalid token' }); }
}
function admin(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' }); next(); }

router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error while fetching users' }); }
});

router.get('/words', auth, admin, async (req, res) => {
  try {
    const words = await Word.find({}).sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, words });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error while fetching words' }); }
});

router.post('/words', auth, admin, async (req, res) => {
  try {
    const wordData = req.body;
    const requiredFields = ['word', 'meaning', 'translation', 'example', 'exampleTranslation', 'level', 'partOfSpeech'];
    const missing = requiredFields.filter(f => !wordData[f]);
    if (missing.length) return res.status(400).json({ success: false, message: 'Missing: ' + missing.join(', ') });
    const exists = await Word.findOne({ word: wordData.word.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Word already exists' });
    const w = new Word(wordData); await w.save();
    res.status(201).json({ success: true, word: w });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error while adding word' }); }
});

router.delete('/words/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Word.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ success: false, message: 'Word not found' });
    res.json({ success: true, message: 'Deleted', id });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error while deleting word' }); }
});

module.exports = router;
