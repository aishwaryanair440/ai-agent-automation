const mongoose = require("mongoose");

const DocumentChunkSchema = new mongoose.Schema(
    {
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Document",
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        chunkIndex: {
            type: Number,
            required: true
        },

        content: {
            type: String,
            required: true
        },

        embedding: {
            type: [Number],
            required: true
        }
    },
    { timestamps: true }
);

DocumentChunkSchema.index({
    userId: 1,
    documentId: 1
});

module.exports =
    mongoose.models.DocumentChunk ||
    mongoose.model("DocumentChunk", DocumentChunkSchema);