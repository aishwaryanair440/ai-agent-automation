const Document = require("../models/document.model");
const DocumentChunk = require("../models/documentChunk.model");

const { runEmbedding } = require("../agents/embeddingAdapter");

const STALE_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000;

function safeProcessingError(error) {

    if (!error) return "Document processing failed";

    const message = error instanceof Error
        ? error.message
        : String(error);

    return message.slice(0, 500) || "Document processing failed";
}

function chunkText(text, chunkSize = 1200, overlap = 200) {

    const chunks = [];

    let start = 0;

    while (start < text.length) {

        const end = start + chunkSize;

        const piece = text.slice(start, end).trim();

        if (piece) chunks.push(piece);

        start += chunkSize - overlap;
    }

    return chunks;
}

function cosineSimilarity(vecA, vecB) {

    if (vecA.length !== vecB.length) return 0;

    let dot = 0, normA = 0, normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (!normA || !normB) return 0;

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function processDocument(agent, document, text) {

    try {
        await Document.findByIdAndUpdate(document._id, {
            processingStep: "Chunking"
        });

        const chunks = chunkText(text);

        await Document.findByIdAndUpdate(document._id, {
            processingStep: "Embedding chunks",
            processedChunks: 0,
            totalChunks: chunks.length
        });

        const records = [];

        for (let i = 0; i < chunks.length; i++) {

            const content = chunks[i];

            const embedding = await runEmbedding(content, agent);

            records.push({
                documentId: document._id,
                userId: document.userId,
                chunkIndex: i,
                content,
                embedding
            });

            await Document.updateOne(
                {
                    _id: document._id,
                    status: "processing"
                },
                {
                    processedChunks: i + 1
                }
            );
        }

        const currentDocument = await Document.findById(document._id)
            .select("status")
            .lean();

        if (!currentDocument || currentDocument.status !== "processing") {
            throw new Error("Document processing was interrupted");
        }

        await DocumentChunk.insertMany(records);

        await Document.updateOne(
            {
                _id: document._id,
                status: "processing"
            },
            {
                $set: {
                    status: "ready",
                    processingStep: "Ready",
                    processedAt: new Date(),
                    processedChunks: records.length,
                    totalChunks: records.length,
                    chunkCount: records.length
                },
                $unset: { processingError: "" }
            }
        );
    } catch (error) {
        await DocumentChunk.deleteMany({
            documentId: document._id
        });

        await Document.findByIdAndUpdate(document._id, {
            status: "failed",
            processingStep: "Failed",
            processingError: safeProcessingError(error),
            processedAt: new Date()
        });

        throw error;
    }
}

async function markStaleProcessingDocumentsAsFailed() {

    const staleBefore = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS);

    return Document.updateMany(
        {
            status: "processing",
            $or: [
                { processingStartedAt: { $lt: staleBefore } },
                { processingStartedAt: { $exists: false } }
            ]
        },
        {
            status: "failed",
            processingStep: "Failed",
            processingError: "Processing was interrupted or timed out",
            processedAt: new Date()
        }
    );
}

async function queryDocument(agent, userId, documentId, query, topK = 3) {

    return queryDocuments(agent, userId, [documentId], query, topK);
}

async function queryDocuments(agent, userId, documentIds, query, topK = 3) {

    const parsedTopK = Number(topK);
    const limit = Number.isFinite(parsedTopK)
        ? Math.max(0, Math.floor(parsedTopK))
        : 3;

    const uniqueDocumentIds = [...new Map(
        (Array.isArray(documentIds) ? documentIds : [])
            .filter(Boolean)
            .map(id => [id.toString(), id])
    ).values()];

    if (!uniqueDocumentIds.length) {
        return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await runEmbedding(query, agent);

    // Fetch only the chunks from the selected documents
    const chunks = await DocumentChunk.find({
        userId,
        documentId: { $in: uniqueDocumentIds }
    })
        .select("documentId chunkIndex content embedding") // load only required fields
        .lean();

    if (!chunks.length) {
        return [];
    }

    // Compute cosine similarity
    const scored = chunks.map(chunk => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by similarity score
    scored.sort((a, b) => b.score - a.score);

    // Return topK results
    return scored.slice(0, limit);
}

module.exports = {
    processDocument,
    queryDocument,
    queryDocuments,
    markStaleProcessingDocumentsAsFailed,
    STALE_PROCESSING_THRESHOLD_MS
};
