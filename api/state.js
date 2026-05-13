import { get, put } from "@vercel/blob";

const STATE_PATH = "the-carwash-at-shell/shared-state.json";

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

function sendJson(response, statusCode, value) {
  response.statusCode = statusCode;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

function normalizeState(value = {}) {
  return {
    ...emptyState,
    ...value,
    customers: Array.isArray(value.customers) ? value.customers : [],
    activities: Array.isArray(value.activities) ? value.activities : [],
    draws: Array.isArray(value.draws) ? value.draws : [],
    feedback: Array.isArray(value.feedback) ? value.feedback : [],
    bookings: Array.isArray(value.bookings) ? value.bookings : [],
    menuProducts: Array.isArray(value.menuProducts) ? value.menuProducts : [],
    notice:
      value.notice && typeof value.notice === "object"
        ? { ...emptyState.notice, ...value.notice }
        : { ...emptyState.notice },
  };
}

function normalizePayload(value = {}) {
  return {
    version: Number(value.version || 1),
    state: normalizeState(value.state || emptyState),
  };
}

async function requestJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function streamText(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

async function writePayload(payload) {
  await put(STATE_PATH, JSON.stringify(normalizePayload(payload), null, 2), {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json; charset=utf-8",
  });
}

async function readPayload() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const result = await get(STATE_PATH, { access: "private" });
  if (!result || result.statusCode === 404) {
    const initialPayload = { version: 1, state: emptyState };
    await writePayload(initialPayload);
    return initialPayload;
  }

  if (result.statusCode !== 200 || !result.stream) {
    throw new Error("Shared database could not be read.");
  }

  return normalizePayload(JSON.parse(await streamText(result.stream)));
}

export default async function handler(request, response) {
  try {
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.setHeader("Allow", "GET, POST, OPTIONS");
      response.end();
      return;
    }

    if (request.method === "GET") {
      sendJson(response, 200, await readPayload());
      return;
    }

    if (request.method === "POST") {
      const current = await readPayload();
      const body = await requestJson(request);
      const payload = {
        version: current.version + 1,
        state: normalizeState(body.state || emptyState),
      };
      await writePayload(payload);
      sendJson(response, 200, payload);
      return;
    }

    response.setHeader("Allow", "GET, POST, OPTIONS");
    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Shared database error.",
    });
  }
}
