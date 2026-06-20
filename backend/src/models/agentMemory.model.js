const mongoose = require("mongoose");

const AgentMemorySchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        required: true,
        index: true
    },

    content: {
        type: String,
        required: true
    },

    embedding: {
        type: [Number],
        required: true
    },

    metadata: {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow" },
        type: { type: String, default: "conversation" }
    },
    embeddingProvider: {
        type: String,
        enum: ["ollama", "openai", "gemini", "huggingface", "groq"],
        default: null
    },
    embeddingModel: { type: String, default: null },

}, { timestamps: true });

module.exports =
    mongoose.models.AgentMemory ||
    mongoose.model("AgentMemory", AgentMemorySchema);