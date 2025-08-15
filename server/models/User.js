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
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    lastResult: {
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
  skillScores: {
    vocab: { type: Number, default: 0 },
    grammar: { type: Number, default: 0 },
    fluency: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 }
  },
  levelBuffer: { 
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

// Daily goals, streak & error profile additions (backward compatible defaults handled at access time)
userSchema.add({
  dailyGoals: {
    words: { type: Number, default: 15 },
    messages: { type: Number, default: 20 }
  },
  dailyProgress: {
    date: { type: String }, // YYYY-MM-DD
    words: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    completed: { type: Boolean, default: false }
  },
  streak: { type: Number, default: 0 },
  errorProfile: {
    grammar: { type: Number, default: 0 },
    vocab: { type: Number, default: 0 },
    tense: { type: Number, default: 0 },
    agreement: { type: Number, default: 0 }
  }
});

// Advanced adaptive analytics fields (added later; optional in existing docs)
userSchema.add({
  emaSkills: {
    grammar: { type: Number, default: 0 },
    vocab: { type: Number, default: 0 },
    fluency: { type: Number, default: 0 }
  },
  metricsHistory: [{
    at: { type: Date, default: Date.now },
    grammar: Number,
    vocab: Number,
    fluency: Number,
    composite: Number,
    structureUsed: Boolean
  }],
  lastComposite: { type: Number, default: 0 },
  bufferStats: {
    samples: { type: Number, default: 0 },
    promotions: { type: Number, default: 0 },
    demotions: { type: Number, default: 0 }
  }
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

userSchema.methods.cycleTargetStructure = function() {
  const cycle = ['present_simple','past_simple','future_will','present_perfect','comparatives','conditionals_first'];
  const idx = cycle.indexOf(this.currentTargetStructure);
  this.currentTargetStructure = cycle[(idx + 1) % cycle.length];
  this.targetStructureAttempts = 0;
};

userSchema.methods.applyAdaptiveMetrics = function(metrics) {
  if (!metrics) return;
  // Normalize incoming (fallback to 0..5 bounds)
  const g = Math.min(5, Math.max(0, metrics.grammar ?? metrics.grammar_score ?? 0));
  const v = Math.min(5, Math.max(0, metrics.vocab ?? metrics.vocab_score ?? 0));
  const f = Math.min(5, Math.max(0, metrics.fluency ?? metrics.fluency_score ?? 0));
  const structureUsed = !!metrics.structureUsed;

  // Exponential moving averages (stabilize noise)
  const alphaBase = 0.18; // smoothing factor
  const samples = (this.bufferStats?.samples || 0) + 1;
  const alpha = samples < 10 ? (alphaBase + 0.1) : alphaBase; // faster adapt early
  this.emaSkills = this.emaSkills || { grammar: g, vocab: v, fluency: f };
  this.emaSkills.grammar = this.emaSkills.grammar ? (this.emaSkills.grammar * (1 - alpha) + g * alpha) : g;
  this.emaSkills.vocab   = this.emaSkills.vocab   ? (this.emaSkills.vocab * (1 - alpha) + v * alpha) : v;
  this.emaSkills.fluency = this.emaSkills.fluency ? (this.emaSkills.fluency * (1 - alpha) + f * alpha) : f;

  // Composite (weighted: grammar 40%, vocab 30%, fluency 30%)
  const composite = +(this.emaSkills.grammar * 0.4 + this.emaSkills.vocab * 0.3 + this.emaSkills.fluency * 0.3).toFixed(3);

  // History (cap last 60)
  this.metricsHistory = this.metricsHistory || [];
  this.metricsHistory.push({ at: new Date(), grammar: g, vocab: v, fluency: f, composite, structureUsed });
  if (this.metricsHistory.length > 60) this.metricsHistory = this.metricsHistory.slice(-60);

  // Track short window variance (last 8 composites)
  const window = this.metricsHistory.slice(-8);
  const mean = window.reduce((a,m)=>a+m.composite,0) / window.length;
  const variance = window.reduce((a,m)=>a+Math.pow(m.composite-mean,2),0)/Math.max(1, window.length-1);
  const std = Math.sqrt(variance);
  const coeffVar = mean ? std/mean : 0; // relative variability (0.. ~)

  // Dynamic baseline per dynamicLevel that scales upward when stable, downward when unstable
  const baseBaselines = { A1: 2.2, A2: 2.9, B1: 3.5 };
  const stabilityFactor = Math.max(0, 1 - coeffVar); // 1 when stable, lower when noisy
  const adaptiveLift = stabilityFactor * Math.min(1, samples/25) * 0.6; // up to +0.6 when very stable
  const dynamicBaseline = baseBaselines[this.dynamicLevel] + adaptiveLift;

  // Time-based decay of buffer (pre-adjust) to allow falling if user stops performing
  const now = Date.now();
  if (this.lastAssessmentAt) {
    const hours = (now - this.lastAssessmentAt.getTime()) / 3600000;
    if (hours > 0.5) { // decay each half-hour chunk
      const decayFactor = Math.pow(0.985, hours); // slow decay
      this.levelBuffer *= decayFactor;
    }
  }
  this.lastAssessmentAt = new Date(now);

  // Performance gap
  const gap = composite - dynamicBaseline; // positive -> above baseline

  // Reliability weighting: requires both sample size & stability
  const reliability = Math.min(1, samples / 30) * (0.5 + 0.5 * stabilityFactor); // 0.5..1 as stability improves

  // Incremental buffer update with shrink when already high
  const saturation = 1 - Math.min(1, Math.abs(this.levelBuffer)/12); // slows near edges
  this.levelBuffer += gap * 0.9 * reliability * saturation; // main update

  // Penalize recent negative trend explicitly (last 5 vs previous 5)
  if (this.metricsHistory.length >= 12) {
    const last5 = this.metricsHistory.slice(-5).map(m=>m.composite);
    const prev5 = this.metricsHistory.slice(-10,-5).map(m=>m.composite);
    const avgLast = last5.reduce((a,b)=>a+b,0)/5;
    const avgPrev = prev5.reduce((a,b)=>a+b,0)/5;
    const trend = avgLast - avgPrev;
    if (trend < -0.35) { // strong decline
      this.levelBuffer += trend * 1.5; // negative value -> decreases buffer
    }
  }

  // Error profile penalty (recent errors reduce buffer slightly)
  if (this.errorProfile) {
    const totalErrors = (this.errorProfile.grammar||0)+(this.errorProfile.vocab||0)+(this.errorProfile.tense||0)+(this.errorProfile.agreement||0);
    if (totalErrors > 0) {
      const recentPenalty = Math.min(0.6, totalErrors * 0.01); // mild
      this.levelBuffer -= recentPenalty * (1 - stabilityFactor * 0.5); // larger penalty if unstable
    }
  }

  // Clamp buffer range
  this.levelBuffer = Math.max(-12, Math.min(12, this.levelBuffer));

  // Promotion / demotion logic with hysteresis
  const order = ['A1','A2','B1'];
  const idx = order.indexOf(this.dynamicLevel);
  // Need minimum evidence
  if (samples >= 12) {
    if (this.levelBuffer >= 8 && idx < order.length-1 && composite > dynamicBaseline + 0.4 && reliability > 0.6) {
      this.dynamicLevel = order[idx+1];
      this.levelBuffer = 1; // small carry-over
      if (this.bufferStats) this.bufferStats.promotions += 1;
    } else if (this.levelBuffer <= -8 && idx > 0 && composite < dynamicBaseline - 0.5) {
      this.dynamicLevel = order[idx-1];
      this.levelBuffer = -1;
      if (this.bufferStats) this.bufferStats.demotions += 1;
    }
  }

  // Update basic skillScores (public surface) & consistency
  this.skillScores.grammar = +(this.emaSkills.grammar.toFixed(2));
  this.skillScores.vocab = +(this.emaSkills.vocab.toFixed(2));
  this.skillScores.fluency = +(this.emaSkills.fluency.toFixed(2));
  // Consistency derived from stability (invert variability) & reliability
  this.skillScores.consistency = +(Math.min(5, Math.max(0, 5 * (0.4 + 0.6 * stabilityFactor) * reliability))).toFixed(2);

  // Structure targeting: if structure used frequently -> cycle
  if (structureUsed) {
    this.targetStructureAttempts = (this.targetStructureAttempts||0) + 1;
    if (this.targetStructureAttempts >= 4) this.cycleTargetStructure();
  }

  // Update counters
  this.bufferStats.samples = samples;
  this.lastComposite = composite;

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
    entry.interval = Math.min(entry.interval * 2, 32);
    entry.mastery = Math.min(entry.mastery + 1, 5);
  } else {
    entry.interval = 1;
    entry.mastery = Math.max(1, entry.mastery - 1);
  }
  const next = new Date();
  next.setDate(next.getDate() + entry.interval);
  entry.nextReviewAt = next;
  return entry;
};

// Utility to ensure daily progress doc is for today
function todayStr() { return new Date().toISOString().slice(0,10); }

userSchema.methods._ensureDailyContext = function() {
  if (!this.dailyProgress || this.dailyProgress.date !== todayStr()) {
    const prev = this.dailyProgress;
    const prevCompleted = prev && prev.date && prev.completed;
    // If yesterday was completed and exactly one day gap -> keep streak, else reset when gap >1 and not completed
    if (prev && prev.date) {
      const prevDate = new Date(prev.date + 'T00:00:00Z');
      const diffDays = Math.floor((Date.now() - prevDate.getTime())/86400000);
      if (diffDays === 1) {
        if (!prevCompleted) this.streak = 0; // missed goal yesterday
      } else if (diffDays > 1) {
        this.streak = 0; // long gap resets streak
      }
    }
    this.dailyProgress = { date: todayStr(), words: 0, messages: 0, completed: false };
  }
};

userSchema.methods.updateDailyProgress = function(kind, increment = 1) {
  this._ensureDailyContext();
  if (kind === 'word') this.dailyProgress.words += increment;
  if (kind === 'message') this.dailyProgress.messages += increment;
  if (!this.dailyProgress.completed && this.dailyProgress.words >= this.dailyGoals.words && this.dailyProgress.messages >= this.dailyGoals.messages) {
    this.dailyProgress.completed = true;
    this.streak += 1;
  }
};

userSchema.methods.recordErrors = function(categories = []) {
  if (!Array.isArray(categories)) return;
  categories.forEach(c => {
    if (['grammar','vocab','tense','agreement'].includes(c)) {
      this.errorProfile[c] = (this.errorProfile[c] || 0) + 1;
    }
  });
};

module.exports = mongoose.model('User', userSchema);
