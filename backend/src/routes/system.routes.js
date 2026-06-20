const express = require("express");
const router = express.Router();
const { getSystemEnvStatus, getProviderDiscovery } = require("../controllers/system.controller");
const auth = require("../middleware/auth.middleware");

router.get("/env", auth, getSystemEnvStatus);
router.get("/providers", auth, getProviderDiscovery);

module.exports = router;
