const express = require('express');
const router = express.Router();
const Word = require('../models/Word');

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

router.post('/', async (req, res) => {
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

module.exports = router;
