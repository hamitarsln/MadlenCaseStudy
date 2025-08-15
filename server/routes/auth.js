const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Use parent app limiter if provided
router.use((req,res,next)=>{
  const limiter = req.app.get('authLimiter');
  if (limiter) return limiter(req,res,next);
  next();
});
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
        message: 'E-posta, ad ve şifre gerekli'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalı'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta ile zaten bir kullanıcı mevcut'
      });
    }

    const newUser = new User({
      email: email.toLowerCase(),
      name: name.trim(),
      password,
      levelConfirmed: false 
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Kullanıcı kaydedildi, seviye testi gerekli',
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
      message: 'Kayıt sırasında sunucu hatası'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-posta ve şifre gerekli'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kimlik bilgileri'
      });
    }

    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Giriş başarılı',
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
      message: 'Giriş sırasında sunucu hatası'
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
      message: 'Seviye testi başarıyla tamamlandı',
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
      message: 'Seviye testi sırasında sunucu hatası'
    });
  }
});

// Adaptive level test question bank with tiers
const LEVEL_TEST_BANK = {
  A1: [
    { id: 'A1-1', q: 'Choose correct: I ___ a book now.', a: ['read','am read','am reading','reading'], correct: 2 },
    { id: 'A1-2', q: 'Past form of "go"?', a: ['goed','went','goes','gone'], correct: 1 },
    { id: 'A1-3', q: 'Meaning of "improve"?', a: ['to make better','to remove','to buy','to delay'], correct: 0 },
    { id: 'A1-4', q: 'She ___ apples every day.', a: ['eat','eats','is eat','are eating'], correct: 1 },
    { id: 'A1-5', q: 'Opposite of "big"?', a: ['large','huge','small','tall'], correct: 2 }
  ],
  A2: [
    { id: 'A2-1', q: 'Choose correct: If I ___ time, I will help.', a: ['will have','have','had','am having'], correct: 1 },
    { id: 'A2-2', q: 'Synonym of "method"?', a: ['device','way','error','line'], correct: 1 },
    { id: 'A2-3', q: 'Past of "see"?', a: ['seed','saw','seen','see'], correct: 1 },
    { id: 'A2-4', q: 'Choose correct: They have ___ homework.', a: ['much','many','a','an'], correct: 1 },
    { id: 'A2-5', q: 'Which fits: She has lived here ___ 2019.', a: ['for','since','during','by'], correct: 1 }
  ],
  B1: [
    { id: 'B1-1', q: 'Choose: If I had money, I ___ a car.', a: ['will buy','buy','would buy','would bought'], correct: 2 },
    { id: 'B1-2', q: 'Meaning of "sustainable"?', a: ['temporary','endless','maintainable','expensive'], correct: 2 },
    { id: 'B1-3', q: 'Reported speech: He said he ___ early.', a: ['leave','left','was leaving','leaves'], correct: 1 },
    { id: 'B1-4', q: 'Pick closest to "crucial"', a: ['unimportant','essential','late','tiny'], correct: 1 },
    { id: 'B1-5', q: 'Choose: The film ___ when we arrived.', a: ['already started','had already started','has started','was start'], correct: 1 }
  ]
};

function buildAdaptiveSet() {
  // Start with A1 baseline; promote tier if 3/4 correct per block of 4
  const sequence = ['A1','A2','B1'];
  const picked = [];
  // pick 3 from A1
  const shuffle = arr => [...arr].sort(()=>Math.random()-0.5);
  const a1 = shuffle(LEVEL_TEST_BANK.A1).slice(0,3); picked.push(...a1);
  // add 3 from A2
  const a2 = shuffle(LEVEL_TEST_BANK.A2).slice(0,3); picked.push(...a2);
  // add 3 from B1
  const b1 = shuffle(LEVEL_TEST_BANK.B1).slice(0,3); picked.push(...b1);
  // Return without correct info for client
  return picked;
}

router.get('/level-test/questions', (req,res) => {
  const set = buildAdaptiveSet();
  res.json({ success:true, questions: set.map(({correct, ...rest})=>rest) });
});

router.post('/level-test/submit', async (req,res) => {
  try {
    const { answers, userId } = req.body; 
    if (!Array.isArray(answers) || !userId) return res.status(400).json({ success:false, message:'answers and userId required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    // Reconstruct adaptive scoring: determine tier counts
    let correctA1=0, totalA1=0, correctA2=0, totalA2=0, correctB1=0, totalB1=0;
    answers.forEach(ans => {
      const tier = typeof ans.id === 'string' ? ans.id.split('-')[0] : null;
      const bank = tier && LEVEL_TEST_BANK[tier];
      if (!bank) return;
      const q = bank.find(q=>q.id===ans.id);
      if (!q) return;
      if (tier==='A1') totalA1++; if (tier==='A2') totalA2++; if (tier==='B1') totalB1++;
      if (q.correct === ans.answerIndex) {
        if (tier==='A1') correctA1++; if (tier==='A2') correctA2++; if (tier==='B1') correctB1++;
      }
    });
    // Determine level: if B1 accuracy >=60% choose B1 else if A2 >=60% choose A2 else A1.
    const acc = (c,t)=> t? (c/t):0;
    const accB1 = acc(correctB1,totalB1);
    const accA2 = acc(correctA2,totalA2);
    let level='A1';
    if (accB1>=0.6) level='B1'; else if (accA2>=0.6) level='A2';
    user.level = level;
    user.levelConfirmed = true;
    user.levelTestScore = Math.round(Math.max(acc(correctA1,totalA1), accA2, accB1)*5);
    await user.save();
    res.json({ success:true, level, scores:{ A1: {correct:correctA1,total:totalA1}, A2:{correct:correctA2,total:totalA2}, B1:{correct:correctB1,total:totalB1} } });
  } catch (e) {
    console.error('Level test submit error', e);
    res.status(500).json({ success:false, message:'Seviye testi gönderilemedi' });
  }
});

module.exports = router;
