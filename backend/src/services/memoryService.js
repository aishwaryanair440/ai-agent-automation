const AgentMemory = require("../models/agentMemory.model");
const { runEmbedding } = require("../agents/embeddingAdapter");

/* -------- Cosine Similarity -------- */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;

    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* -------- Store Memory -------- */
async function storeMemory(agent, content, metadata = {}) {
    const embedding = await runEmbedding(content, agent);

    if (!content || content.length < 20) {
        return;
    }

    await AgentMemory.create({
        agentId: agent._id,
        content,
        embedding,
        metadata,

        embeddingProvider: agent?.config?.provider || null,
        embeddingModel: agent?.config?.embeddingModel || agent?.config?.model || null
    });

    /* -------- Retention Policy -------- */
    const MAX_MEMORIES_PER_AGENT = 500;

    const count = await AgentMemory.countDocuments({
        agentId: agent._id
    });

    if (count > MAX_MEMORIES_PER_AGENT) {
        const excess = count - MAX_MEMORIES_PER_AGENT;

        const oldest = await AgentMemory.find({
            agentId: agent._id,
            "metadata.type": "conversation"
        })
            .sort({ createdAt: 1 }) // oldest first
            .limit(excess)
            .select("_id");

        const ids = oldest.map(m => m._id);

        await AgentMemory.deleteMany({
            _id: { $in: ids }
        });
    }
}

/* -------- Retrieve Top-K -------- */
async function retrieveMemory(agent, queryText, topK = 5, minScore = 0.45) {
    const queryEmbedding = await runEmbedding(queryText, agent);

    const memories = await AgentMemory.find({
        agentId: agent._id,
        "metadata.type": "conversation"
    }).lean();

    const scored = memories
        .map(m => ({
            ...m,
            score: cosineSimilarity(queryEmbedding, m.embedding)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log(
        scored.map(m => ({
            score: m.score.toFixed(3),
            preview: m.content.slice(0, 60)
        }))
    );

    return scored;
}

module.exports = {
    storeMemory,
    retrieveMemory
};