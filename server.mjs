import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4173);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "shared-state.json");

const emptyState = {
  customers: [],
  activities: [],
  draws: [],
  feedback: [],
  bookings: [],
  menuProducts: [],
  notice: {
    active: false,
    type: "Open",
    message: "",
    expiresOn: "",
    updatedAt: "",
  },
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

let writeQueue = Promise.resolve();

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await stat(DATA_FILE);
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ version: 1, state: emptyState }, null, 2));
  }
}

async function readSharedState() {
  await ensureDataFile();
  try {
    const payload = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return {
      version: Number(payload.version || 1),
      state: { ...emptyState, ...(payload.state || {}) },
    };
  } catch {
    return { version: 1, state: emptyState };
  }
}

async function writeSharedState(nextState) {
  writeQueue = writeQueue.then(async () => {
    const current = await readSharedState();
    const payload = {
      version: current.version + 1,
      state: { ...emptyState, ...nextState },
    };
    await writeFile(DATA_FILE, JSON.stringify(payload, null, 2));
    return payload;
  });
  return writeQueue;
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function safeStaticPath(url) {
  const parsed = new URL(url, `http://127.0.0.1:${PORT}`);
  const cleanPath = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
  const fullPath = path.normalize(path.join(ROOT, cleanPath));
  if (!fullPath.startsWith(ROOT)) return null;
  return fullPath;
}

async function serveStatic(request, response) {
  const filePath = safeStaticPath(request.url);
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, await readSharedState());
      return;
    }

    if (url.pathname === "/api/state" && request.method === "POST") {
      const body = await readRequestJson(request);
      sendJson(response, 200, await writeSharedState(body.state || {}));
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }

    response.writeHead(405, { Allow: "GET, POST, HEAD" });
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`THE CARWASH @ SHELL app running at http://127.0.0.1:${PORT}`);
});
