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
        levelTestScore: user.levelTestScore,
        progress: user.progress,
        wordsLearned: user.wordsLearned,
        lastActive: user.lastActive,
        isDailyGoalMet: user.isDailyGoalMet()
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
    const { wordsLearned, dailyGoal, streak } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (wordsLearned !== undefined) user.progress.wordsLearned = wordsLearned;
    if (dailyGoal !== undefined) user.progress.dailyGoal = dailyGoal;
    if (streak !== undefined) user.progress.streak = streak;

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
      progress: user.progress,
      isDailyGoalMet: user.isDailyGoalMet()
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

module.exports = router;
