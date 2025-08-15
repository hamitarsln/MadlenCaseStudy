const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  translation: {
    type: String,
    required: true,
    trim: true
  },
  example: {
    type: String,
    required: true,
    trim: true
  },
  exampleTranslation: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['A1', 'A2', 'B1']
  },
  category: {
    type: String,
    enum: ['daily', 'academic', 'business', 'travel', 'technology', 'health', 'food', 'family', 'nature', 'emotions'],
    default: 'daily'
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 1
  },
  pronunciation: {
    type: String,
    trim: true
  },
  partOfSpeech: {
    type: String,
    enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun'],
    required: true
  },
  synonyms: [{
    type: String,
    trim: true
  }],
  antonyms: [{
    type: String,
    trim: true
  }],
  frequency: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoAdded: {
    type: Boolean,
    default: false
  },
  pendingReview: {
    type: Boolean,
    default: false
  },
  origin: {
    type: String,
    enum: ['manual','ai-extracted'],
    default: 'manual'
  }
}, {
  timestamps: true
});

wordSchema.index({ level: 1, isActive: 1 });
wordSchema.index({ category: 1, level: 1 });
wordSchema.index({ word: 'text', meaning: 'text' });

wordSchema.statics.getRandomWordsByLevel = async function(level, count = 10) {
  return await this.aggregate([
    { $match: { level: level, isActive: true } },
    { $sample: { size: count } }
  ]);
};

wordSchema.statics.searchWords = async function(query, level = null) {
  const searchQuery = {
    isActive: true,
    $or: [
      { word: { $regex: query, $options: 'i' } },
      { meaning: { $regex: query, $options: 'i' } },
      { translation: { $regex: query, $options: 'i' } }
    ]
  };
  
  if (level) {
    searchQuery.level = level;
  }
  
  return await this.find(searchQuery).limit(20);
};

module.exports = mongoose.model('Word', wordSchema);
