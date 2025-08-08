const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
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
    res.status(500).json({ success: false, message: 'Cannot list channels' });
  }
});

router.post('/channels', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.create({ userId: req.user.id, title: title?.trim() || 'New Chat', messages: [] });
    res.status(201).json({ success: true, channel: { id: chat._id, title: chat.title } });
  } catch (e) {
    console.error('Create channel error', e);
    res.status(500).json({ success: false, message: 'Cannot create channel' });
  }
});

router.delete('/channels/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Chat.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Channel not found' });
    res.json({ success: true, message: 'Channel deleted' });
  } catch (e) {
    console.error('Delete channel error', e);
    res.status(500).json({ success: false, message: 'Cannot delete channel' });
  }
});

router.get('/channels/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: 'Channel not found' });
    res.json({ success: true, channel: { id: chat._id, title: chat.title, messages: chat.messages } });
  } catch (e) {
    console.error('Get channel error', e);
    res.status(500).json({ success: false, message: 'Cannot get channel' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { message, channelId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let chatDoc;
    if (channelId) {
      chatDoc = await Chat.findOne({ _id: channelId, userId });
      if (!chatDoc) {
        return res.status(404).json({ success: false, message: 'Channel not found' });
      }
    } else {
      chatDoc = await Chat.create({ userId, messages: [], title: 'New Chat' });
    }

  const systemPrompt = createPersonalizedPrompt(user);

    const historyForAI = chatDoc.messages.slice(-10).map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.message }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyForAI,
      { role: 'user', content: message }
    ];

    let aiResponse;

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      aiResponse = generateMockResponse(message, user.level);
      // Parse mock metrics & update user
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
      } catch (_) { /* ignore */ }
      const visible = aiResponse.replace(/```json[\s\S]*?```/i, '').trim();
      await persistChat(user, chatDoc, message, aiResponse); // store full (with metrics) if needed for audits
      if (chatDoc.title === 'New Chat') {
        chatDoc.title = message.substring(0, 40) + (message.length > 40 ? '…' : '');
        await chatDoc.save();
      }
      return res.json({ success: true, response: visible, channelId: chatDoc._id, title: chatDoc.title, isDemo: true });
    }

    let data = null;
    try {
      const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'Madlen English Learning App'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!openRouterResponse.ok) {
        const errorData = await openRouterResponse.json().catch(() => ({}));
        console.error('[AI] Provider error status', openRouterResponse.status, errorData);
        throw new Error(errorData.error?.message || 'Provider returned error');
      }
      data = await openRouterResponse.json();
      aiResponse = data.choices?.[0]?.message?.content || 'I am here to help you practice English.';
    } catch (aiErr) {
      // Graceful fallback to mock instead of 500 so chat continues
      console.warn('[AI] Falling back to mock response due to error:', aiErr.message);
      aiResponse = generateMockResponse(message, user.level) + '\n(temporary fallback)';
    }

    // Optional: attempt to parse trailing JSON metrics if model followed instruction
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
          await user.save();
        }
      }
    } catch (e) {
      // silent parsing fail
    }

  await persistChat(user, chatDoc, message, aiResponse);

  const visible = aiResponse.replace(/```json[\s\S]*?```/i, '').trim();

    if (chatDoc.title === 'New Chat') {
      chatDoc.title = message.substring(0, 40) + (message.length > 40 ? '…' : '');
      await chatDoc.save();
    }

    await extractAndStoreLearned(user, aiResponse);

  return res.json({ success: true, response: visible, usage: data?.usage, channelId: chatDoc._id, title: chatDoc.title, level: user.level, dynamicLevel: user.dynamicLevel });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, message: 'Chat service unavailable' });
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

function createPersonalizedPrompt(user) {
  const levelDescriptions = {
    A1: 'Keep language very simple with basic grammar and common vocabulary.',
    A2: 'Use simple past and future occasionally, introduce new words gently.',
    B1: 'Use richer vocabulary and varied sentence structures, encourage elaboration.'
  };
  const target = user.currentTargetStructure || 'present_simple';
  return `You are an encouraging English tutor. Student fixed level: ${user.level}. Dynamic level: ${user.dynamicLevel}. ${levelDescriptions[user.dynamicLevel] || levelDescriptions[user.level]}\nTarget structure to gently elicit: ${target}. If learner avoids it twice, craft a question that requires it.\nReturn natural dialogue. At end append a compact JSON metrics block like: {"grammar_score":1-5,"vocab_score":1-5,"fluency_score":1-5,"structure_used":true|false} inside a fenced \`\`\`json block.`;
}

function generateMockResponse(message, level) {
  const templates = {
    A1: [
      'Great! Can you say it again in another way? *New word*: "practice" means to do something many times to get better.',
      'Good job! Let me teach you a new word: "improve" means to make something better.',
      'Nice! Try using this new word: "helpful" means useful or giving help.',
      'Well done! Here\'s a useful word: "comfortable" means feeling relaxed and at ease.'
    ],
    A2: [
      'Nice sentence! Can you add more detail? *New word*: "describe" means to say what something is like.',
      'Good explanation! Try using: "however" means but or on the other hand.',
      'Interesting point! Learn this word: "opinion" means what you think about something.',
      'That\'s thoughtful! New word: "experience" means something that happens to you.'
    ],
    B1: [
      'Excellent analysis! Could you expand with an example? *New word*: "approach" means a way of doing something.',
      'Well reasoned! Consider this word: "perspective" means a way of thinking about something.',
      'Thoughtful response! Try: "consequence" means a result of an action.',
      'Great insight! Learn: "significance" means importance or meaning.'
    ]
  };
  
  const levelTemplates = templates[level] || templates.A1;
  const randomTemplate = levelTemplates[Math.floor(Math.random() * levelTemplates.length)];

  // Simple heuristic mock metrics
  const base = message.length > 40 ? 3 : 2;
  const metrics = {
    grammar_score: Math.min(5, base + Math.floor(Math.random() * 3)),
    vocab_score: Math.min(5, base + Math.floor(Math.random() * 3)),
    fluency_score: Math.min(5, base + Math.floor(Math.random() * 3)),
    structure_used: /\b(will|did|has|have)\b/i.test(message)
  };

  return `${randomTemplate}\n\n\n\n\`\`\`json\n${JSON.stringify(metrics)}\n\`\`\``.replace(/`/g,'`');
}

async function extractAndStoreLearned(user, aiResponse) {
  try {
    const regex = /\*new\*\s*([a-zA-Z'-]{2,})/g; 
    const found = new Set();
    let match;
    while ((match = regex.exec(aiResponse)) !== null) {
      found.add(match[1].toLowerCase());
    }
    if (found.size === 0) return;
    const Word = require('../models/Word');
    const words = await Word.find({ word: { $in: Array.from(found) } });
    for (const w of words) {
      if (!user.wordsLearned.find(x => x.wordId.toString() === w._id.toString())) {
        user.wordsLearned.push({ wordId: w._id, mastery: 1 });
        user.progress.wordsLearned += 1;
      }
    }
    const structureMap = [
      { key: 'past_simple', pattern: /\b(did|was|were)\b/i },
      { key: 'future_will', pattern: /\bwill\b/i },
      { key: 'present_perfect', pattern: /\b(has|have)\s+\w+ed\b/i }
    ];
    structureMap.forEach(s => {
      if (s.pattern.test(aiResponse)) {
        const existing = user.learnedStructures.find(ls => ls.key === s.key);
        if (existing) { existing.count += 1; existing.lastSeen = new Date(); }
        else user.learnedStructures.push({ key: s.key, count: 1 });
      }
    });
    user.updateDynamicLevel && user.updateDynamicLevel();
    await user.save();
  } catch (e) {
    console.error('extractAndStoreLearned error', e);
  }
}

module.exports = router;
