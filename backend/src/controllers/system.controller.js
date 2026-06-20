const axios = require("axios");

/* ----------------------------------
   ENV STATUS
---------------------------------- */
async function getSystemEnvStatus(req, res) {
  return res.json({
    ok: true,
    env: {
      groq: Boolean(process.env.GROQ_API_KEY),
      ollama: Boolean(process.env.OLLAMA_HOST),
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      hf: Boolean(process.env.HF_API_KEY),
    },
  });
}

/* ----------------------------------
   PROVIDER DISCOVERY
---------------------------------- */
async function getProviderDiscovery(req, res) {
  try {
    const providers = {};

    /* -------- GROQ -------- */
    providers.groq = {
      available: Boolean(process.env.GROQ_API_KEY),
      models: [
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768"
      ],
    };

    /* -------- OPENAI -------- */
    providers.openai = {
      available: Boolean(process.env.OPENAI_API_KEY),
      models: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-3.5-turbo"
      ],
    };

    /* -------- GEMINI -------- */
    providers.gemini = {
      available: Boolean(process.env.GEMINI_API_KEY),
      models: [
        "gemini-2.5-flash",
        "gemini-2.5-pro"
      ],
    };

    /* -------- HUGGINGFACE -------- */
    providers.huggingface = {
      available: Boolean(process.env.HF_API_KEY),
      models: [
        "mistralai/Mistral-7B-Instruct-v0.2",
        "meta-llama/Llama-2-7b-chat-hf"
      ],
    };

    /* -------- OLLAMA (Dynamic) -------- */
    let ollamaModels = [];

    if (process.env.OLLAMA_HOST) {
      try {
        const response = await axios.get(
          `${process.env.OLLAMA_HOST}/api/tags`
        );

        ollamaModels =
          response.data?.models?.map((m) => m.name) || [];
      } catch (err) {
        console.error("Ollama model fetch failed:", err.message);
      }
    }

    providers.ollama = {
      available: Boolean(process.env.OLLAMA_HOST),
      models: ollamaModels,
    };

    return res.json({
      ok: true,
      providers,
    });
  } catch (err) {
    console.error("getProviderDiscovery error", err);
    return res.status(500).json({
      ok: false,
      error: "provider_discovery_failed",
    });
  }
}

/* ----------------------------------
   WORKER SETTINGS VERSION
---------------------------------- */
let workerCacheVersion = Date.now();

function bumpWorkerSettingsVersion() {
  workerCacheVersion = Date.now();
}

function getWorkerSettingsVersion() {
  return workerCacheVersion;
}

module.exports = {
  getSystemEnvStatus,
  getProviderDiscovery,
  bumpWorkerSettingsVersion,
  getWorkerSettingsVersion,
};