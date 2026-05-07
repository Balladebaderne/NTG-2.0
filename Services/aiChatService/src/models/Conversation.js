const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, default: uuidv4, unique: true },
    customerId: { type: String },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
