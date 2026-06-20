const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
  listMemories,
  listAgents,
  deleteMemory,
  clearAgentMemory
} = require("../controllers/memory.controller");

router.get("/", auth, listMemories);
router.get("/agents", auth, listAgents);

router.delete("/:id", auth, deleteMemory);
router.delete("/agent/:agentId", auth, clearAgentMemory);

module.exports = router;