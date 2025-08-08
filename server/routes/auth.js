const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret_key',
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, name and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const newUser = new User({
      email: email.toLowerCase(),
      name: name.trim(),
      password,
      levelConfirmed: false // will be set after test
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered, level test required',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        level: newUser.level,
        role: newUser.role,
        levelConfirmed: newUser.levelConfirmed
      },
      requiresLevelTest: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        level: user.level,
        progress: user.progress,
        levelTestScore: user.levelTestScore,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

router.post('/level-test', async (req, res) => {
  try {
    const { userId, score } = req.body;

    if (!userId || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID and score are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.levelTestScore = score;
    user.level = user.calculateLevel();
    await user.save();

    res.json({
      success: true,
      message: 'Level test completed successfully',
      result: {
        score,
        level: user.level,
        totalQuestions: 5
      }
    });

  } catch (error) {
    console.error('Level test error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during level test'
    });
  }
});

// Level test questions (simple static for now)
const LEVEL_TEST_QUESTIONS = [
  { id: 1, q: 'Choose correct: I ___ a book now.', a: ['read','am read','am reading','reading'], correct: 2, weight: { A1:1, A2:1, B1:0 } },
  { id: 2, q: 'Past form of "go"?', a: ['goed','went','goes','gone'], correct: 1, weight: { A1:1, A2:1, B1:1 } },
  { id: 3, q: 'Meaning of "improve"?', a: ['to make better','to remove','to buy','to delay'], correct: 0, weight: { A1:0, A2:1, B1:1 } },
  { id: 4, q: 'Choose correct: If I ___ time, I will help.', a: ['will have','have','had','am having'], correct: 1, weight: { A1:0, A2:1, B1:1 } },
  { id: 5, q: 'Synonym of "method"?', a: ['device','way','error','line'], correct: 1, weight: { A1:0, A2:0, B1:1 } }
];

router.get('/level-test/questions', (req,res) => {
  res.json({ success:true, questions: LEVEL_TEST_QUESTIONS.map(({correct, weight, ...rest})=>rest) });
});

router.post('/level-test/submit', async (req,res) => {
  try {
    const { answers, userId } = req.body; // answers: [{id, answerIndex}]
    if (!Array.isArray(answers) || !userId) return res.status(400).json({ success:false, message:'answers and userId required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    let scoreA1=0, scoreA2=0, scoreB1=0, total=0;
    answers.forEach(ans => {
      const q = LEVEL_TEST_QUESTIONS.find(x=>x.id===ans.id);
      if (!q) return;
      total++;
      if (q.correct === ans.answerIndex) {
        scoreA1 += q.weight.A1;
        scoreA2 += q.weight.A2;
        scoreB1 += q.weight.B1;
      }
    });
    // Determine level by highest weighted score
    const scores = { A1: scoreA1, A2: scoreA2, B1: scoreB1 };
    const level = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
    user.level = level;
    user.levelConfirmed = true;
    user.levelTestScore = Math.max(scoreA1, scoreA2, scoreB1);
    await user.save();
    res.json({ success:true, level, scores });
  } catch (e) {
    console.error('Level test submit error', e);
    res.status(500).json({ success:false, message:'Level test submit failed' });
  }
});

module.exports = router;
