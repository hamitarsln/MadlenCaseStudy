const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Word = require('../models/Word');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (typeof user._ensureDailyContext === 'function') user._ensureDailyContext();
    const debug = req.query.debug === '1' || req.headers['x-debug-adaptive'] === '1';
    const base = {
      id: user._id,
      name: user.name,
      email: user.email,
      level: user.level,
      dynamicLevel: user.dynamicLevel,
      levelBuffer: user.levelBuffer,
      currentTargetStructure: user.currentTargetStructure,
      skillScores: user.skillScores,
      streak: user.streak,
      dailyGoals: user.dailyGoals,
      dailyProgress: user.dailyProgress
    };
    if (debug) {
      base.debugAdaptive = {
        emaSkills: user.emaSkills,
        lastComposite: user.lastComposite,
        bufferStats: user.bufferStats,
        metricsWindow: (user.metricsHistory || []).slice(-8),
        lastAssessmentAt: user.lastAssessmentAt
      };
    }
    res.json({ success:true, user: base });
  } catch (e) {
    console.error('Get me error', e);
    res.status(500).json({ success:false, message:'Cannot fetch profile' });
  }
});

// Daily summary endpoint
router.get('/me/daily', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (typeof user._ensureDailyContext === 'function') user._ensureDailyContext();
    await user.save();
    res.json({ success:true, daily: {
      date: user.dailyProgress?.date,
      goals: user.dailyGoals,
      progress: user.dailyProgress,
      streak: user.streak,
      errorProfile: user.errorProfile
    }});
  } catch (e) {
    console.error('Daily summary error', e);
    res.status(500).json({ success:false, message:'Cannot fetch daily summary' });
  }
});

// Update daily goals
router.put('/me/daily/goals', auth, async (req, res) => {
  try {
    const { words, messages } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (words !== undefined) user.dailyGoals.words = Math.min(200, Math.max(1, parseInt(words)));
    if (messages !== undefined) user.dailyGoals.messages = Math.min(500, Math.max(1, parseInt(messages)));
    await user.save();
    res.json({ success:true, goals: user.dailyGoals });
  } catch (e) {
    console.error('Update daily goals error', e);
    res.status(500).json({ success:false, message:'Cannot update goals' });
  }
});

router.get('/:id', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const user = await User.findById(req.params.id)
      .populate('wordsLearned.wordId', 'word meaning level');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        level: user.level,
        dynamicLevel: user.dynamicLevel,
        levelBuffer: user.levelBuffer,
        currentTargetStructure: user.currentTargetStructure,
        skillScores: user.skillScores,
        levelTestScore: user.levelTestScore,
        progress: user.progress,
        wordsLearned: user.wordsLearned,
        learnedStructures: user.learnedStructures,
        lastActive: user.lastActive
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

router.put('/:id/progress', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { wordsLearned } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (wordsLearned !== undefined) user.progress.wordsLearned = wordsLearned;

    await user.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: user.progress
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating progress'
    });
  }
});

router.post('/:id/learn-word', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { wordId, mastery = 1 } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    const existingIndex = user.wordsLearned.findIndex(
      item => item.wordId.toString() === wordId
    );

    if (existingIndex >= 0) {
      user.wordsLearned[existingIndex].mastery = Math.min(mastery, 5);
      user.wordsLearned[existingIndex].learnedAt = new Date();
    } else {
      user.wordsLearned.push({
        wordId,
        mastery: Math.min(mastery, 5),
        learnedAt: new Date()
      });
      user.progress.wordsLearned += 1;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Word marked as learned',
      progress: user.progress
    });

  } catch (error) {
    console.error('Learn word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking word as learned'
    });
  }
});

router.post('/:id/chat-history', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { message, isUser } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.chatHistory.push({
      message,
      isUser,
      timestamp: new Date()
    });

    if (isUser) {
      user.progress.totalChatMessages += 1;
    }

    if (user.chatHistory.length > 100) {
      user.chatHistory = user.chatHistory.slice(-100);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Message added to chat history'
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving chat message'
    });
  }
});

router.get('/:id/chat-history', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { limit = 50 } = req.query;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const chatHistory = user.chatHistory
      .slice(-parseInt(limit))
      .sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      success: true,
      chatHistory
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat history'
    });
  }
});

router.get('/:id/progress/summary', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const user = await User.findById(req.params.id).populate('wordsLearned.wordId','word meaning level');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    const learnedWords = user.wordsLearned.map(w => ({ id: w.wordId?._id, word: w.wordId?.word, level: w.wordId?.level, mastery: w.mastery, meaning: w.wordId?.meaning, learnedAt: w.learnedAt }));
    res.json({
      success:true,
      summary: {
        level: user.level,
        dynamicLevel: user.dynamicLevel,
        levelBuffer: user.levelBuffer,
        skillScores: user.skillScores,
        levelConfirmed: user.levelConfirmed,
        progress: user.progress,
        counts: {
          totalLearned: learnedWords.length,
          structures: user.learnedStructures.length
        },
        structures: user.learnedStructures,
        words: learnedWords
      }
    });
  } catch (e) {
    console.error('Progress summary error', e);
    res.status(500).json({ success:false, message:'Cannot fetch progress summary' });
  }
});

module.exports = router;
