const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  session_id: { type: String, required: true }, // Create a unique session ID for each convo context
  
  messages: [
    {
        role: { type: String, enum: ["user", "assistant", "system"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }
  ],
  
  context_summary: { type: String }, // Auto-updated summary of the conversation
  last_updated: { type: Date, default: Date.now }
});

const ChatHistory = mongoose.model("chatHistory", chatHistorySchema);
module.exports = ChatHistory;
