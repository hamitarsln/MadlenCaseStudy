const express = require('express');
const router = express.Router();
const User = require('../models/User');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/', async (req, res) => {
  try {
    const { userId, message, conversationHistory = [] } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and message are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const systemPrompt = createPersonalizedPrompt(user);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), 
      { role: 'user', content: message }
    ];

    if (!process.env.OPENROUTER_API_KEY) {
      const mockResponse = generateMockResponse(message, user.level);
      
      await saveChatMessage(userId, message, mockResponse);
      
      return res.json({
        success: true,
        response: mockResponse,
        isDemo: true
      });
    }

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000', 
        'X-Title': 'Madlen English Learning App' 
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free', 
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${openRouterResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await openRouterResponse.json();
    const aiResponse = data.choices[0].message.content;

    await saveChatMessage(userId, message, aiResponse);

    res.json({
      success: true,
      response: aiResponse,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    try {
      const user = await User.findById(req.body.userId);
      const mockResponse = generateMockResponse(req.body.message, user?.level || 'A1');
      
      await saveChatMessage(req.body.userId, req.body.message, mockResponse);
      
      res.json({
        success: true,
        response: mockResponse,
        isDemo: true,
        error: 'OpenAI API unavailable, using demo response'
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Chat service temporarily unavailable'
      });
    }
  }
});

function createPersonalizedPrompt(user) {
  const levelDescriptions = {
    A1: 'You are helping a beginner English learner (A1 level). Use simple words and short sentences. Focus on basic vocabulary, present tense, and everyday topics.',
    A2: 'You are helping an elementary English learner (A2 level). Use common words and simple grammar. You can introduce past tense and future forms occasionally.',
    B1: 'You are helping an intermediate English learner (B1 level). Use varied vocabulary and more complex sentences. You can discuss abstract topics and use different tenses.'
  };

  return `You are a friendly and patient English tutor for high school students. ${levelDescriptions[user.level]}

Student Profile:
- Name: ${user.name}
- Level: ${user.level}
- Words learned: ${user.progress.wordsLearned}

Guidelines:
1. Always be encouraging and supportive
2. Correct mistakes gently and explain why
3. Ask follow-up questions to keep conversation going
4. Introduce new vocabulary appropriate to their level
5. Use examples and context to help understanding
6. Keep responses conversational and engaging
7. If they make grammar mistakes, gently correct them and explain
8. Encourage them to use new words they've learned

Respond naturally as if you're chatting with a student who wants to improve their English.`;
}

function generateMockResponse(message, level) {
  const responses = {
    A1: [
      "That's great! Can you tell me more about that?",
      "I understand! That sounds interesting. What do you think about it?",
      "Good job! Can you use that word in another sentence?",
      "Nice! I like how you expressed that. Can you tell me something else?",
    ],
    A2: [
      "That's a good point! I think you're getting better at expressing your ideas. What else would you like to talk about?",
      "Excellent! You're using English very well. Can you describe how you felt about that experience?",
      "I see what you mean! That's an interesting perspective. Have you had similar experiences before?",
      "Great job! Your English is improving. Can you explain why you think that way?",
    ],
    B1: [
      "That's a fascinating perspective! I appreciate how you've articulated your thoughts. What factors influenced your opinion on this matter?",
      "Excellent analysis! You're demonstrating strong communication skills. Could you elaborate on the implications of what you've described?",
      "I find your viewpoint quite compelling! You're expressing complex ideas clearly. How do you think others might perceive this situation?",
      "Outstanding! Your language skills are really developing. What connections can you draw between this topic and your personal experiences?",
    ]
  };

  const levelResponses = responses[level] || responses.A1;
  return levelResponses[Math.floor(Math.random() * levelResponses.length)];
}

async function saveChatMessage(userId, userMessage, aiResponse) {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.chatHistory.push({
        message: userMessage,
        isUser: true,
        timestamp: new Date()
      });
      
      user.chatHistory.push({
        message: aiResponse,
        isUser: false,
        timestamp: new Date()
      });

      user.progress.totalChatMessages += 1;
      
      if (user.chatHistory.length > 100) {
        user.chatHistory = user.chatHistory.slice(-100);
      }
      
      await user.save();
    }
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

module.exports = router;
