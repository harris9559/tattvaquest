const express = require("express");
const cors = require("cors");
const { getSupabaseClient } = require("./db/supabase");
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
