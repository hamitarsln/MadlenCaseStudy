const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Word = require('../models/Word');
const User = require('../models/User');
const mongoose = require('mongoose'); // added for ObjectId in learning queue

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'dev_secret_key');
    next();
  } catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }
}
function admin(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' }); next(); }

// LEARNING HUB ENDPOINTS
// Get study queue (due reviews + new suggestions)
router.get('/learning/queue', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wordsLearned.wordId');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });

    // Due review entries
    const dueEntries = typeof user.getDueWordEntries === 'function' ? user.getDueWordEntries(50) : [];
    const now = Date.now();
    const dueWords = dueEntries.filter(e => e.wordId).map(e => ({
      id: e.wordId._id,
      word: e.wordId.word,
      meaning: e.wordId.meaning,
      translation: e.wordId.translation,
      level: e.wordId.level,
      mastery: e.mastery,
      nextReviewAt: e.nextReviewAt,
      interval: e.interval,
      overdue: e.nextReviewAt && e.nextReviewAt.getTime() < now,
      review: true
    }));

    const targetQueueSize = 15;
    let remaining = Math.max(0, targetQueueSize - dueWords.length);

    // Collect new candidate words (not yet learned) with a simple find instead of aggregate
    let newWords = [];
    if (remaining > 0) {
      const learnedIds = new Set(user.wordsLearned.map(w => w.wordId && w.wordId._id ? w.wordId._id.toString() : ''));
      const level = user.level || user.dynamicLevel || 'A1';
      const candidates = await Word.find({ level, isActive: true }).limit(200).lean();
      const filtered = candidates.filter(c => !learnedIds.has(c._id.toString()));
      // Shuffle
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
      newWords = filtered.slice(0, remaining).map(w => ({
        id: w._id,
        word: w.word,
        meaning: w.meaning,
        translation: w.translation,
        level: w.level,
        mastery: 0,
        review: false
      }));
    }

    return res.json({
      success: true,
      queue: [...dueWords, ...newWords],
      meta: {
        dueCount: dueWords.length,
        newCount: newWords.length,
        totalLearned: user.wordsLearned.length
      }
    });
  } catch (e) {
    console.error('Learning queue fatal error:', e.stack || e);
    res.status(500).json({ success:false, message:'Cannot build learning queue', error: e.message });
  }
});

// Mark new word as started/learned (adds to user words)
router.post('/learning/start', auth, async (req, res) => {
  try {
    const { wordId } = req.body;
    if (!wordId) return res.status(400).json({ success:false, message:'wordId required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.wordsLearned.find(w => w.wordId.toString() === wordId)) {
      return res.json({ success:true, message:'Already in list' });
    }
    user.wordsLearned.push({ wordId, mastery:1, interval:1, nextReviewAt: new Date() });
    user.progress.wordsLearned += 1;
    await user.save();
    res.status(201).json({ success:true, message:'Word added to learning list' });
  } catch (e) {
    console.error('Learning start error', e);
    res.status(500).json({ success:false, message:'Cannot start learning word' });
  }
});

// Review a word (spaced repetition update)
router.post('/learning/review', auth, async (req, res) => {
  try {
    const { wordId, correct } = req.body;
    if (!wordId || typeof correct !== 'boolean') return res.status(400).json({ success:false, message:'wordId and correct(boolean) required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    const updated = user.updateLearningProgress(wordId, correct);
    if (!updated) return res.status(404).json({ success:false, message:'Word not in learning list' });
    await user.save();
    res.json({ success:true, result: {
      mastery: updated.mastery,
      interval: updated.interval,
      nextReviewAt: updated.nextReviewAt,
      lastResult: updated.lastResult
    }});
  } catch (e) {
    console.error('Learning review error', e);
    res.status(500).json({ success:false, message:'Cannot review word' });
  }
});

// Recommendations (words close to mastery threshold or same category)
router.get('/learning/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wordsLearned.wordId');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    const masteredCategories = {};
    user.wordsLearned.forEach(w => {
      if (w.mastery >= 4 && w.wordId?.category) {
        masteredCategories[w.wordId.category] = (masteredCategories[w.wordId.category] || 0) + 1;
      }
    });
    const topCategory = Object.entries(masteredCategories).sort((a,b)=>b[1]-a[1])[0]?.[0];
    let rec = [];
    if (topCategory) {
      const learnedIds = user.wordsLearned.map(w => w.wordId._id.toString());
      rec = await Word.find({ category: topCategory, level: user.level, isActive:true, _id: { $nin: learnedIds } }).limit(10);
    } else {
      rec = await Word.find({ level: user.level, isActive:true }).limit(10);
    }
    res.json({ success:true, recommendations: rec });
  } catch (e) {
    console.error('Learning recommendations error', e);
    res.status(500).json({ success:false, message:'Cannot fetch recommendations' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      level, 
      category, 
      search, 
      limit = 20, 
      page = 1,
      random = false 
    } = req.query;

    let query = { isActive: true };
    
    if (level) query.level = level;
    if (category) query.category = category;
    
    let words;
    
    if (random === 'true') {
      const count = Math.min(parseInt(limit), 50);
      words = await Word.getRandomWordsByLevel(level, count);
    } else if (search) {
      words = await Word.searchWords(search, level);
    } else {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      words = await Word.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ frequency: -1, word: 1 });
    }

    res.json({
      success: true,
      words,
      count: words.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get words error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching words'
    });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { level } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const words = await Word.searchWords(query.trim(), level);

    res.json({
      success: true,
      words,
      query,
      count: words.length
    });

  } catch (error) {
    console.error('Search words error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching words'
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Word.distinct('category', { isActive: true });
    
    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

router.get('/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const { limit = 10, random = 'true' } = req.query;

    if (!['A1', 'A2', 'B1'].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Must be A1, A2, or B1'
      });
    }

    let words;
    
    if (random === 'true') {
      words = await Word.getRandomWordsByLevel(level, parseInt(limit));
    } else {
      words = await Word.find({ level, isActive: true })
        .limit(parseInt(limit))
        .sort({ frequency: -1, word: 1 });
    }

    res.json({
      success: true,
      words,
      level,
      count: words.length
    });

  } catch (error) {
    console.error('Get words by level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching words by level'
    });
  }
});

router.post('/', auth, admin, async (req, res) => {
  try {
    const wordData = req.body;

    const requiredFields = ['word', 'meaning', 'translation', 'example', 'exampleTranslation', 'level', 'partOfSpeech'];
    const missingFields = requiredFields.filter(field => !wordData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const existingWord = await Word.findOne({ 
      word: wordData.word.toLowerCase() 
    });

    if (existingWord) {
      return res.status(400).json({
        success: false,
        message: 'Word already exists'
      });
    }

    const newWord = new Word(wordData);
    await newWord.save();

    res.status(201).json({
      success: true,
      message: 'Word added successfully',
      word: newWord
    });

  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding word'
    });
  }
});

router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Word.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Word not found' });
    res.json({ success: true, message: 'Word deleted', id });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting word' });
  }
});

router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [words, total] = await Promise.all([
      Word.find({}).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Word.countDocuments({})
    ]);
    res.json({ success: true, words, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error while listing all words' });
  }
});

module.exports = router;
