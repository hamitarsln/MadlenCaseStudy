const express = require('express');
const router = express.Router();
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const limiter = req.app.get('chatLimiter');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
});
const User = require('../models/User');
const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token bulunamadı' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

router.get('/channels', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select('title updatedAt createdAt');
    res.json({ success: true, channels: chats });
  } catch (e) {
    console.error('List channels error', e);
    res.status(500).json({ success: false, message: 'Kanallar listelenemedi' });
  }
});

router.post('/channels', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.create({ userId: req.user.id, title: title?.trim() || 'New Chat', messages: [] });
    res.status(201).json({ success: true, channel: { id: chat._id, title: chat.title } });
  } catch (e) {
    console.error('Create channel error', e);
    res.status(500).json({ success: false, message: 'Kanal oluşturulamadı' });
  }
});

router.delete('/channels/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Chat.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Kanal bulunamadı' });
    res.json({ success: true, message: 'Kanal silindi' });
  } catch (e) {
    console.error('Delete channel error', e);
    res.status(500).json({ success: false, message: 'Kanal silinemedi' });
  }
});

router.get('/channels/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: 'Kanal bulunamadı' });
    res.json({ success: true, channel: { id: chat._id, title: chat.title, messages: chat.messages } });
  } catch (e) {
    console.error('Get channel error', e);
    res.status(500).json({ success: false, message: 'Kanal getirilemedi' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { message, channelId, suggestedWords } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Mesaj gerekli' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    let chatDoc;
    if (channelId) {
      chatDoc = await Chat.findOne({ _id: channelId, userId });
      if (!chatDoc) {
        return res.status(404).json({ success: false, message: 'Kanal bulunamadı' });
      }
    } else {
      chatDoc = await Chat.create({ userId, messages: [], title: 'Yeni Sohbet' });
    }

  const systemPrompt = createPersonalizedPrompt(user, chatDoc.messages.slice(-6), {
    suggestedWords: suggestedWords || []
  });

    const historyForAI = chatDoc.messages.slice(-10).map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.message }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyForAI,
      { role: 'user', content: message }
    ];

    let aiResponse;

    if (!GEMINI_API_KEY) {
      aiResponse = generateMockResponse(message, user.level);
      try {
        const jsonMatch = aiResponse.match(/```json([\s\S]*?)```/i) || aiResponse.match(/\{\s*"grammar_score"[\s\S]*?\}/i);
        if (jsonMatch) {
          const metricsObj = JSON.parse(jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0]);
          if (metricsObj && typeof metricsObj.grammar_score === 'number') {
            user.applyAdaptiveMetrics && user.applyAdaptiveMetrics({
              grammar: metricsObj.grammar_score,
              vocab: metricsObj.vocab_score || 0,
              fluency: metricsObj.fluency_score || 0,
              structureUsed: !!metricsObj.structure_used
            });
            await user.save();
          }
        }
      } catch (_) {}
      const visible = cleanResponseForDisplay(aiResponse);
      await persistChat(user, chatDoc, message, aiResponse);
      if (chatDoc.title === 'Yeni Sohbet') {
        chatDoc.title = message.substring(0, 40) + (message.length > 40 ? '…' : '');
        await chatDoc.save();
      }
      return res.json({ success: true, response: visible, channelId: chatDoc._id, title: chatDoc.title, isDemo: true });
    }

    let data = null;
    try {
      const geminiMessages = historyForAI.concat([{ role: 'user', content: message }]);
      const geminiContent = systemPrompt + '\n\nGeçmiş konuşma:\n' + 
        geminiMessages.map(m => `${m.role === 'user' ? 'Öğrenci' : 'Öğretmen'}: ${m.content}`).join('\n') +
        '\n\nLütfen yukarıdaki sistem talimatlarına göre yanıtla:';

      const geminiResp = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: geminiContent
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!geminiResp.ok) {
        const errorData = await geminiResp.json().catch(() => ({}));
        console.error('[AI] Gemini error status', geminiResp.status, errorData);
        throw new Error(errorData.error?.message || 'Gemini API error');
      }
      
      data = await geminiResp.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, şu anda yanıt veremiyorum.';
    } catch (aiErr) {
      console.warn('[AI] Falling back to mock response due to error:', aiErr.message);
      aiResponse = generateMockResponse(message, user.level) + '\n(geçici demo yanıtı)';
    }

    try {
      const jsonMatch = aiResponse.match(/```json([\s\S]*?)```/i) || aiResponse.match(/\{\s*"grammar_score"[\s\S]*?\}/i);
      if (jsonMatch) {
        const metricsObj = JSON.parse(jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0]);
        if (metricsObj && typeof metricsObj.grammar_score === 'number') {
          user.applyAdaptiveMetrics && user.applyAdaptiveMetrics({
            grammar: metricsObj.grammar_score,
            vocab: metricsObj.vocab_score || metricsObj.vocab || metricsObj.vocabScore || 0,
            fluency: metricsObj.fluency_score || metricsObj.fluency || 0,
            structureUsed: !!metricsObj.structure_used
          });
        }
      }
    } catch (e) {
      console.error('Error parsing AI response JSON:', e);
    }

    await persistChat(user, chatDoc, message, aiResponse);
    try { user.updateDailyProgress && user.updateDailyProgress('message', 1); await user.save(); } catch(_) {}

  let visible = aiResponse
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/\{\s*"grammar_score"[\s\S]*?\}/gi, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();

    if (chatDoc.title === 'Yeni Sohbet') {
      chatDoc.title = message.substring(0, 40) + (message.length > 40 ? '…' : '');
      await chatDoc.save();
    }

    await extractAndStoreLearned(user, aiResponse);
    try {
      const lower = message.toLowerCase();
      const errs = [];
      if (/(he|she|it) don't\b/.test(lower)) errs.push('agreement');
      if (/\bi (go|come|see) yesterday\b/.test(lower)) errs.push('tense');
      if (/\bme (like|want|need)\b/.test(lower)) errs.push('grammar');
      if (/\bvery (good|nice)\b/.test(lower)) errs.push('vocab');
      if (errs.length) { user.recordErrors && user.recordErrors(errs); await user.save(); }
    } catch(_) {}

    return res.json({ success: true, response: visible, usage: data?.usage, channelId: chatDoc._id, title: chatDoc.title, level: user.level, dynamicLevel: user.dynamicLevel });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, message: 'Sohbet servisi kullanılamıyor' });
  }
});

async function persistChat(user, chatDoc, userMessage, aiMessage) {
  chatDoc.messages.push({ message: userMessage, isUser: true });
  chatDoc.messages.push({ message: aiMessage, isUser: false });
  if (chatDoc.messages.length > 200) chatDoc.messages = chatDoc.messages.slice(-200);
  await chatDoc.save();

  user.chatHistory.push({ message: userMessage, isUser: true });
  user.chatHistory.push({ message: aiMessage, isUser: false });
  user.progress.totalChatMessages += 1;
  if (user.chatHistory.length > 100) user.chatHistory = user.chatHistory.slice(-100);
  await user.save();
}

function createPersonalizedPrompt(user, recentHistory = [], options = {}) {
  const { suggestedWords = [] } = options;
  const extraWords = suggestedWords.length ? `Try to (only if natural) use: ${suggestedWords.join(', ')}.` : '';
  const fenceHint = '{"grammar_score":1-5,"vocab_score":1-5,"fluency_score":1-5,"new_words":["optional_word"]}';
  return [
    'Role: friendly English chat partner.',
    `Level: ${user.level} (dynamic ${user.dynamicLevel})`,
    'Guidelines:',
    '- Correct mistakes lightly in a natural reply (fix first, then a short follow-up question).',
    '- Keep it to 1–2 short sentences.',
    '- Focus strictly on the user\'s last message.',
    '- Optionally introduce ONE new word and mark it **like this**.',
    extraWords,
    'Finish with JSON metrics in a fenced code block labelled json: '+fenceHint
  ].filter(Boolean).join('\n');
}

function generateMockResponse(message, level) {
  const hasErrors = detectErrors(message);
  const improvements = suggestImprovements(message, level);
  
  let response = '';
  
  if (hasErrors.length > 0) {
    response = hasErrors[0];
  }
  else if (improvements) {
    response = improvements;
  }
  else {
    const conversationStarters = {
      A1: [
        'That sounds **nice**! What else? 😊',
        'Cool! Tell me more? 😊',
        'Really? How was it? 😊'
      ],
      A2: [
        'That\'s **interesting**! Why? 🤔',
        'Sounds **great**! What happened? 🤔', 
        'Nice! Tell me more about it? 🤔'
      ],
      B1: [
        'Great **perspective**! What do you think? 🤔',
        'That\'s **fascinating**! Can you **elaborate**? 🤔',
        'Interesting **analysis**! Why? 🤔'
      ]
    };
    
    const responses = conversationStarters[level] || conversationStarters.A1;
    response = responses[Math.floor(Math.random() * responses.length)];
  }

  const metrics = analyzeMessage(message);
  return response.trim() + '\n\n```json\n' + JSON.stringify(metrics, null, 2) + '\n```';
}

function detectErrors(message) {
  const errors = [];
  const msg = message.toLowerCase().trim();
  
  if (msg.includes('i are') || msg.includes('you is') || msg.includes('we is')) {
    errors.push('Oh, you mean "I am, you are, we are" right? ✨');
  }
  if (msg.includes("don't") && (msg.includes('she ') || msg.includes('he ') || msg.includes('it '))) {
    errors.push('Ah, you mean "doesn\'t" for he/she/it! 👍');
  }
  if (msg.match(/\b(go|come|see) yesterday\b/)) {
    errors.push('You mean "went, came, saw" yesterday? 📚');
  }
  if (msg.match(/\bme (like|want|need)\b/)) {
    errors.push('Oh, you mean "I like/want/need"! 😊');
  }
  if (msg.match(/\b(much|many) (people|person)\b/)) {
    errors.push('You mean "many people"? 💡');
  }
  
  return errors.slice(0, 1); 
}

function suggestImprovements(message, level) {
  const msg = message.toLowerCase();
  
  const improvements = {
    A1: [
      { from: 'good', to: '**nice**', context: 'You could also say it\'s **nice**!' },
      { from: 'big', to: '**large**', context: 'Or you could say **large** too!' },
      { from: 'happy', to: '**glad**', context: 'You could say you\'re **glad** as well!' }
    ],
    A2: [
      { from: 'very good', to: '**excellent**', context: 'You could say **excellent** - sounds great!' },
      { from: 'like', to: '**enjoy**', context: 'You could say you **enjoy** it too!' },
      { from: 'interesting', to: '**fascinating**', context: 'Or **fascinating** - even stronger!' }
    ],
    B1: [
      { from: 'think', to: '**believe**', context: 'You could say you **believe** or **consider** it too!' },
      { from: 'important', to: '**crucial**', context: 'You could call it **crucial** or **significant**!' },
      { from: 'good idea', to: '**brilliant concept**', context: 'What a **brilliant concept**!' }
    ]
  };
  
  const levelWords = improvements[level] || improvements.A1;
  
  for (const imp of levelWords) {
    if (msg.includes(imp.from)) {
      return imp.context + ' 💫';
    }
  }
  
  return null;
}

function analyzeMessage(message) {
  const text = (message || '').trim();
  if (!text) {
    return { grammar_score: 1, vocab_score: 1, fluency_score: 1, structure_used: false, new_words: [] };
  }
  const tokens = text.split(/\s+/).filter(Boolean);
  const rawWordCount = tokens.length;
  const lowerTokens = tokens.map(t => t.replace(/[^a-zA-Z'-]/g,'').toLowerCase()).filter(Boolean);
  const unique = new Set(lowerTokens);
  const typeTokenRatio = unique.size / Math.max(1, lowerTokens.length);

  const errorPatterns = [
    /(he|she|it) don't\b/i,
    /\bme (like|want|need)\b/i,
    /\b(i|you|we|they) is\b/i,
    /\bi (go|come|see|eat|play) yesterday\b/i,
    /\bvery (good|nice|big)\b/i,
    /\bpeoples\b/i,
    /\bmore better\b/i,
    /\b\w+ did went\b/i
  ];
  let grammarErrors = 0;
  errorPatterns.forEach(r => { if (r.test(text)) grammarErrors++; });
  const sentenceSplits = text.split(/[.!?]+/).filter(s => s.trim().length);
  const avgSentenceLen = sentenceSplits.length ? rawWordCount / sentenceSplits.length : rawWordCount;
  if (avgSentenceLen > 28) grammarErrors += 1;

  let grammarScore = 4 - grammarErrors;
  if (/(have|has) \w+ed\b/i.test(text) || /would \b\w+\b/i.test(text) || /was \w+ed\b/i.test(text)) grammarScore += 0.4;
  grammarScore = Math.min(5, Math.max(1, grammarScore));

  const advancedLexicon = [ 'fascinating','crucial','significant','analysis','perspective','concept','improve','strategy','approach','challenge','efficient','creative','complex','accuracy','elaborate','consider','alternative','solution','context','example','experience' ];
  const advancedHits = lowerTokens.filter(t => advancedLexicon.includes(t)).length;
  const rareRatio = advancedHits / Math.max(1, lowerTokens.length);
  const freq = {}; lowerTokens.forEach(t=>freq[t]=(freq[t]||0)+1);
  const heavyRepeats = Object.values(freq).filter(c=>c>=3).length;
  let vocabScore = 2.5;
  vocabScore += Math.min(1.5, typeTokenRatio * 2.5);
  vocabScore += Math.min(1.2, rareRatio * 12);
  vocabScore -= Math.min(1, heavyRepeats * 0.4);
  vocabScore = Math.min(5, Math.max(1, vocabScore));

  const fragmentCount = sentenceSplits.filter(s => s.trim().split(/\s+/).length < 2).length;
  let fluencyScore = 2.5;
  if (avgSentenceLen >= 8 && avgSentenceLen <= 22) fluencyScore += 1.0;
  if (grammarErrors === 0) fluencyScore += 0.8; else fluencyScore -= Math.min(1.2, grammarErrors * 0.4);
  if (fragmentCount > 1) fluencyScore -= Math.min(1, fragmentCount * 0.5);
  if (rawWordCount > 18 && grammarErrors <= 1) fluencyScore += 0.5;
  fluencyScore = Math.min(5, Math.max(1, fluencyScore));
  const structureUsed = /(have|has) \w+ed\b/i.test(text) || /would \w+\b/i.test(text) || /if .* would/i.test(text) || /because/i.test(text);

  return {
    grammar_score: +grammarScore.toFixed(2),
    vocab_score: +vocabScore.toFixed(2),
    fluency_score: +fluencyScore.toFixed(2),
    structure_used: structureUsed,
    new_words: []
  };
}

async function extractAndStoreLearned(user, aiResponse) {
  try {
    const wordMatches = aiResponse.match(/\*\*([a-zA-Z'-]{2,})\*\*/g);
    const found = new Set();
    
    if (wordMatches) {
      wordMatches.forEach(match => {
        const word = match.replace(/\*\*/g, '').toLowerCase();
        found.add(word);
      });
    }

    try {
      const jsonMatch = aiResponse.match(/```json([\s\S]*?)```/i);
      if (jsonMatch) {
        const metricsObj = JSON.parse(jsonMatch[1].trim());
        if (metricsObj.new_words && Array.isArray(metricsObj.new_words)) {
          metricsObj.new_words.forEach(word => found.add(word.toLowerCase()));
        }
      }
    } catch (e) {
    }

    if (found.size === 0) return;
    
    const Word = require('../models/Word');
    const list = Array.from(found);
    if (!list.length) return;
    const existing = await Word.find({ word: { $in: list } });
    const existingMap = new Map(existing.map(w => [w.word, w]));
    for (const raw of list) {
      const w = existingMap.get(raw);
      if (w) {
        const existingLearned = user.wordsLearned.find(x => x.wordId.toString() === w._id.toString());
        if (!existingLearned) {
          user.wordsLearned.push({ wordId: w._id, mastery: 1, learnedAt: new Date() });
          user.progress.wordsLearned += 1;
        } else if (existingLearned.mastery < 5) {
          existingLearned.mastery += 1;
        }
      } else {
        try {
          const placeholder = await Word.create({
            word: raw,
            meaning: 'To be reviewed',
            translation: 'gözden geçir',
            example: `Example for ${raw} pending`,
            exampleTranslation: 'Örnek gözden geçirilecek',
            level: user.level || 'A1',
            partOfSpeech: 'noun',
            autoAdded: true,
            pendingReview: true,
            origin: 'ai-extracted'
          });
          user.wordsLearned.push({ wordId: placeholder._id, mastery: 1, learnedAt: new Date() });
          user.progress.wordsLearned += 1;
        } catch (e) {
          console.error('Error creating placeholder word:', e);
        }
      }
    }
    
  await user.save();
  } catch (e) {
    console.error('extractAndStoreLearned error', e);
  }
}

function cleanResponseForDisplay(response) {
  return response
    .replace(/```json[\s\S]*?```/gi, '') 
    .replace(/\{\s*"grammar_score"[\s\S]*?\}/gi, '') 
    .replace(/\n\s*\n+/g, '\n')
    .replace(/^\s+|\s+$/g, '') 
    .trim();
}

module.exports = router;
