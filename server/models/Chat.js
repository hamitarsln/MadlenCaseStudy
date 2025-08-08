const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New Chat' },
  messages: [chatMessageSchema]
}, { timestamps: true });

chatSchema.methods.ensureTitle = function () {
  if (!this.title || this.title === 'New Chat') {
    const firstUser = this.messages.find(m => m.isUser);
    if (firstUser) {
      this.title = (firstUser.message.substring(0, 40) + (firstUser.message.length > 40 ? '…' : '')).trim() || 'New Chat';
    }
  }
};

module.exports = mongoose.model('Chat', chatSchema);
