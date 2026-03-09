const express = require("express");
const cors = require("cors");
const { getSupabaseClient } = require("./db/supabase");
const { getSupabaseServiceClient } = require("./db/supabaseService");
const fs = require("fs");
const path = require("path");

function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (!key) continue;
    if (process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const app = express();

app.disable("x-powered-by");
app.use(cors());

app.use(
  express.json({
    limit: "64kb",
    strict: true,
    type: (req) => {
      const method = (req.method || "GET").toUpperCase();
      if (method === "GET" || method === "HEAD") return false;
      return true;
    },
  })
);

function jsonError(res, status, code, message, fields) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  });
}

app.use((req, res, next) => {
  const method = (req.method || "GET").toUpperCase();
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonError(res, 415, "unsupported_media_type", "Content-Type must be application/json");
    }
  }
  return next();
});

app.get("/health", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

function isValidEmail(email) {
  // Intentionally pragmatic (not fully RFC compliant)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return req.ip;
}

const leadRateLimit = {
  windowMs: 10 * 60 * 1000,
  max: 10,
  hits: new Map(),
};

function checkLeadRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req) || "unknown";
  const existing = leadRateLimit.hits.get(ip);

  if (!existing || existing.resetAt <= now) {
    leadRateLimit.hits.set(ip, { count: 1, resetAt: now + leadRateLimit.windowMs });
    return { allowed: true };
  }

  if (existing.count >= leadRateLimit.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

app.post("/contact", (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(res, 400, "validation_error", "Request body must be a JSON object");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  const fields = {};

  if (!name) fields.name = "Name is required";
  if (!email) fields.email = "Email is required";
  else if (!isValidEmail(email)) fields.email = "Email must be a valid email address";

  if (Object.keys(fields).length > 0) {
    return jsonError(res, 400, "validation_error", "Invalid request", fields);
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (_e) {
    return jsonError(res, 500, "internal_error", "Internal server error");
  }

  supabase
    .from("leads")
    .insert([{ name, email, message }])
    .then(({ error }) => {
      if (error) {
        return jsonError(res, 500, "internal_error", "Internal server error");
      }

      return res.status(200).json({ status: "received" });
    })
    .catch(() => {
      return jsonError(res, 500, "internal_error", "Internal server error");
    });
});

const CHAT_AI_SYSTEM_PROMPT = `You are an AI assistant for a LegalTech and Digital Forensics consulting firm.
You may provide high-level informational responses only.
You must not provide legal advice, case assessments, or guarantees.
Always recommend consulting a human expert for case-specific matters.
Keep responses professional, neutral, and concise (2-3 sentences max).`;

const chatAiRateLimit = {
  windowMs: 60 * 1000,
  max: 20,
  hits: new Map(),
};

function checkChatAiRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req) || "unknown";
  const existing = chatAiRateLimit.hits.get(ip);

  if (!existing || existing.resetAt <= now) {
    chatAiRateLimit.hits.set(ip, { count: 1, resetAt: now + chatAiRateLimit.windowMs });
    return { allowed: true };
  }

  if (existing.count >= chatAiRateLimit.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

// POST /api/chat - AI-powered chat endpoint using OpenAI SDK
const CHAT_SYSTEM_PROMPT = `You are TattvaQuest Assistant, a professional LegalTech & Digital Forensics consultant.
Be precise, enterprise-grade, and helpful.
You may provide high-level informational responses only.
You must not provide legal advice, case assessments, or guarantees.
Always recommend consulting a human expert for case-specific matters.
Keep responses professional, neutral, and concise (2-3 sentences max).`;

app.post("/api/chat", async (req, res) => {
  const rate = checkChatAiRateLimit(req);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return jsonError(res, 429, "rate_limited", "Too many requests. Please try again shortly.");
  }

  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(res, 400, "validation_error", "Request body must be a JSON object");
  }

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";

  // Debug logging
  console.log("[/api/chat] Incoming message:", userMessage);
  console.log("[/api/chat] GROQ_API_KEY loaded:", !!process.env.GROQ_API_KEY);

  if (!userMessage) {
    return jsonError(res, 400, "validation_error", "Message is required");
  }

  if (userMessage.length > 1000) {
    return jsonError(res, 400, "validation_error", "Message is too long");
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    console.log("[/api/chat] ERROR: GROQ_API_KEY is not set");
    return res.status(200).json({
      reply: "AI investigation system temporarily unavailable. Please try again later.",
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[/api/chat] Groq API error:", response.status, errorText);
      return res.status(200).json({
        reply: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content?.trim();
    console.log("[/api/chat] AI reply generated successfully");

    if (!aiReply) {
      return res.status(200).json({
        reply: "Thank you for your question. I'm processing your request. Please try again.",
      });
    }

    return res.status(200).json({ reply: aiReply });
  } catch (err) {
    console.error("[/api/chat] Groq error:", err.message || err);
    return res.status(200).json({
      reply: "I apologize for the inconvenience. Please try again.",
    });
  }
});

app.post("/api/chat-ai", async (req, res) => {
  const rate = checkChatAiRateLimit(req);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return jsonError(res, 429, "rate_limited", "Too many requests. Please try again shortly.");
  }

  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(res, 400, "validation_error", "Request body must be a JSON object");
  }

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";

  if (!userMessage) {
    return jsonError(res, 400, "validation_error", "Message is required");
  }

  if (userMessage.length > 1000) {
    return jsonError(res, 400, "validation_error", "Message is too long");
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    // Fallback response when no API key is configured
    return res.status(200).json({
      reply: "AI investigation system temporarily unavailable. Please try again later.",
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: CHAT_AI_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return res.status(200).json({
        reply: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content?.trim();

    if (!aiReply) {
      return res.status(200).json({
        reply: "Thank you for your question. I'm processing your request. Please try again.",
      });
    }

    return res.status(200).json({ reply: aiReply });
  } catch (_e) {
    return res.status(200).json({
      reply: "I apologize for the inconvenience. Please try again.",
    });
  }
});

app.post("/api/lead", (req, res) => {
  const rate = checkLeadRateLimit(req);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return jsonError(res, 429, "rate_limited", "Too many requests. Please try again shortly.");
  }

  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(res, 400, "validation_error", "Request body must be a JSON object");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim() : "";
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.trim() : "";

  const fields = {};

  if (!email) fields.email = "Email is required";
  else if (!isValidEmail(email)) fields.email = "Email must be a valid email address";

  if (!message) fields.message = "Message is required";

  if (name.length > 200) fields.name = "Name is too long";
  if (phone.length > 50) fields.phone = "Phone is too long";
  if (message.length > 5000) fields.message = "Message is too long";
  if (pageUrl.length > 2000) fields.pageUrl = "Page URL is too long";
  if (userAgent.length > 1000) fields.userAgent = "User agent is too long";

  if (Object.keys(fields).length > 0) {
    return jsonError(res, 400, "validation_error", "Invalid request", fields);
  }

  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch (_e) {
    return jsonError(res, 500, "internal_error", "Internal server error");
  }

  supabase
    .from("website_leads")
    .insert([
      {
        name: name || null,
        email,
        phone: phone || null,
        message,
        page_url: pageUrl || null,
        user_agent: userAgent || null,
      },
    ])
    .then(({ error }) => {
      if (error) {
        return jsonError(res, 500, "internal_error", "Internal server error");
      }

      return res.status(200).json({ status: "received" });
    })
    .catch(() => {
      return jsonError(res, 500, "internal_error", "Internal server error");
    });
});

app.use((req, res) => {
  return jsonError(res, 404, "not_found", "Route not found");
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.message && err.message.includes("JSON")) {
    return jsonError(res, 400, "invalid_json", "Malformed JSON payload");
  }

  return jsonError(res, 500, "internal_error", "Internal server error");
});

const port = Number.parseInt(process.env.PORT || "3001", 10);
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down...`);
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
