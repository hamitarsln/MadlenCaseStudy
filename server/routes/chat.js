const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Auth middleware
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

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const systemPrompt = createPersonalizedPrompt(user);

    // Build last 10 messages from Chat collection if exists
    let chatDoc = await Chat.findOne({ userId });
    if (!chatDoc) {
      chatDoc = await Chat.create({ userId, messages: [] });
    }

    const historyForAI = chatDoc.messages.slice(-10).map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.message }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyForAI,
      { role: 'user', content: message }
    ];

    let aiResponse;

    if (!process.env.OPENROUTER_API_KEY) {
      aiResponse = generateMockResponse(message, user.level);
      await persistChat(user, chatDoc, message, aiResponse);
      return res.json({ success: true, response: aiResponse, isDemo: true });
    }

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'Madlen English Learning App'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0325:free',
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'AI provider error');
    }

    const data = await openRouterResponse.json();
    aiResponse = data.choices?.[0]?.message?.content || 'I am here to help you practice English.';

    await persistChat(user, chatDoc, message, aiResponse);

    res.json({ success: true, response: aiResponse, usage: data.usage });

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
  return `You are an encouraging English tutor. Student level: ${user.level}. ${levelDescriptions[user.level]}\nStudent name: ${user.name}.\nRules: Correct mistakes gently, offer 1-2 new words with definitions (mark them with *new*), adapt complexity to level, encourage follow-up. Respond conversationally.`;
}

function generateMockResponse(message, level) {
  const templates = {
    A1: 'Great! Can you say it again in another way? New word: "practice" (to do something many times).',
    A2: 'Nice sentence. Try adding more detail. New word: "improve" (to make better).',
    B1: 'Good explanation. Could you expand with an example? New word: "approach" (a way of doing something).'
  };
  return templates[level] || templates.A1;
}

module.exports = router;
