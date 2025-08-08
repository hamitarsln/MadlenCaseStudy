const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1'],
    default: 'A1'
  },
  dynamicLevel: {
    type: String,
    enum: ['A1', 'A2', 'B1'],
    default: 'A1'
  },
  levelTestScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  progress: {
    wordsLearned: {
      type: Number,
      default: 0
    },
    totalChatMessages: {
      type: Number,
      default: 0
    }
  },
  wordsLearned: [{
    wordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Word'
    },
    learnedAt: {
      type: Date,
      default: Date.now
    },
    mastery: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    nextReviewAt: {
      type: Date,
      default: () => new Date()
    },
    interval: { // in days
      type: Number,
      default: 1,
      min: 1
    },
    lastResult: { // true=correct, false=incorrect
      type: Boolean,
      default: true
    }
  }],
  learnedStructures: [{
    key: String, 
    count: {
      type: Number,
      default: 0
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  chatHistory: [{
    message: String,
    isUser: Boolean,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastActive: {
    type: Date,
    default: Date.now
  },
  levelConfirmed: { type: Boolean, default: false },
  autoPromote: { type: Boolean, default: true }
  ,
  // Dynamic skill & adaptive leveling fields
  skillScores: {
    vocab: { type: Number, default: 0 },
    grammar: { type: Number, default: 0 },
    fluency: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 }
  },
  levelBuffer: { // accumulates delta towards next dynamic level
    type: Number,
    default: 0
  },
  currentTargetStructure: {
    type: String,
    default: 'present_simple'
  },
  targetStructureAttempts: { type: Number, default: 0 },
  lastAssessmentAt: { type: Date }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  this.lastActive = Date.now();
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.calculateLevel = function() {
  if (this.levelTestScore <= 1) return 'A1';
  if (this.levelTestScore <= 3) return 'A2';
  return 'B1';
};

userSchema.methods.promoteIfEligible = function() {
  if (!this.autoPromote) return false;
  const order = ['A1','A2','B1'];
  const currentIndex = order.indexOf(this.level);
  const dynamicIndex = order.indexOf(this.dynamicLevel);
  if (dynamicIndex > currentIndex) {
    // Basic guard: require minimum learned words & structures thresholds before promotion
    const learnedCount = this.wordsLearned.length;
    const structCount = this.learnedStructures.length;
    const thresholds = { A1: { words: 30, structs: 8 }, A2: { words: 80, structs: 18 } };
    const needed = this.level === 'A1' ? thresholds.A1 : thresholds.A2;
    if (learnedCount >= needed.words && structCount >= needed.structs) {
      this.level = this.dynamicLevel;
      return true;
    }
  }
  return false;
};

userSchema.methods.updateDynamicLevel = function() {
  const total = this.learnedStructures.reduce((a,s)=>a+s.count,0);
  const variety = this.learnedStructures.length;
  if (variety > 25 && total > 120) this.dynamicLevel = 'B1';
  else if (variety > 10 && total > 40) this.dynamicLevel = 'A2';
  else this.dynamicLevel = 'A1';
  this.promoteIfEligible();
};

// Advance target structure cyclically
userSchema.methods.cycleTargetStructure = function() {
  const cycle = ['present_simple','past_simple','future_will','present_perfect','comparatives','conditionals_first'];
  const idx = cycle.indexOf(this.currentTargetStructure);
  this.currentTargetStructure = cycle[(idx + 1) % cycle.length];
  this.targetStructureAttempts = 0;
};

// Apply heuristic metrics to adjust level buffer
userSchema.methods.applyAdaptiveMetrics = function(metrics) {
  if (!metrics) return;
  const order = ['A1','A2','B1'];
  const baseline = { A1: 2.0, A2: 3.0, B1: 3.8 };
  const avg = (metrics.vocab + metrics.grammar + metrics.fluency)/3;
  // simple moving scores
  this.skillScores.vocab = metrics.vocab;
  this.skillScores.grammar = metrics.grammar;
  this.skillScores.fluency = metrics.fluency;
  this.skillScores.consistency = Math.min(5, Math.max(0, this.skillScores.consistency * 0.7 + avg * 0.3));
  const delta = (avg - baseline[this.dynamicLevel]) * 0.8; // scale
  this.levelBuffer += delta;
  // Promote/demote thresholds
  if (this.levelBuffer >= 10) {
    const idx = order.indexOf(this.dynamicLevel);
    if (idx < order.length - 1) {
      this.dynamicLevel = order[idx + 1];
      this.levelBuffer = 0;
    } else {
      this.levelBuffer = 10; // cap
    }
  } else if (this.levelBuffer <= -8) {
    const idx = order.indexOf(this.dynamicLevel);
    if (idx > 0) {
      this.dynamicLevel = order[idx - 1];
      this.levelBuffer = 0;
    } else {
      this.levelBuffer = -8;
    }
  }
  // Attempt structure success detection
  if (metrics.structureUsed) {
    this.targetStructureAttempts += 1;
    if (this.targetStructureAttempts >= 3) this.cycleTargetStructure();
  }
  this.promoteIfEligible();
};

userSchema.methods.getDueWordEntries = function(limit = 20) {
  const now = new Date();
  return this.wordsLearned
    .filter(w => w.nextReviewAt <= now)
    .sort((a,b) => a.nextReviewAt - b.nextReviewAt)
    .slice(0, limit);
};

userSchema.methods.updateLearningProgress = function(wordId, correct) {
  const entry = this.wordsLearned.find(w => w.wordId.toString() === wordId.toString());
  if (!entry) return null;
  entry.lastResult = !!correct;
  if (correct) {
    // Simple spaced repetition: double interval until a cap, adjust mastery
    entry.interval = Math.min(entry.interval * 2, 32);
    entry.mastery = Math.min(entry.mastery + 1, 5);
  } else {
    // Reset interval for incorrect answers
    entry.interval = 1;
    entry.mastery = Math.max(1, entry.mastery - 1);
  }
  const next = new Date();
  next.setDate(next.getDate() + entry.interval);
  entry.nextReviewAt = next;
  return entry;
};

module.exports = mongoose.model('User', userSchema);
