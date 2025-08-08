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
    dailyGoal: {
      type: Number,
      default: 10
    },
    streak: {
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

userSchema.methods.isDailyGoalMet = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayWords = this.wordsLearned.filter(word => 
    word.learnedAt >= today
  );
  
  return todayWords.length >= this.progress.dailyGoal;
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

module.exports = mongoose.model('User', userSchema);
