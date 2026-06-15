const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "roadmap";
const BLOB = "current.json";

function getContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING app setting is not configured");
  }
  return BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
}

async function streamToBuffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// The shared document is stored verbatim. It is either the multi-roadmap shape
// { version, roadmaps, data } or the older { tasks, staffing, lanes }; both are
// handled by the client. Returns { doc, etag } so callers can do optimistic
// concurrency on writes.
async function readRoadmap() {
  const blob = getContainerClient().getBlockBlobClient(BLOB);
  if (!(await blob.exists())) {
    return { doc: {}, etag: null };
  }
  const res = await blob.download();
  const buffer = await streamToBuffer(res.readableStreamBody);
  try {
    const parsed = JSON.parse(buffer.toString("utf8"));
    return { doc: parsed && typeof parsed === "object" ? parsed : {}, etag: res.etag };
  } catch {
    return { doc: {}, etag: res.etag };
  }
}

async function writeRoadmap(data, { ifMatch, ifNoneMatch } = {}) {
  const container = getContainerClient();
  await container.createIfNotExists();
  const body = JSON.stringify({ ...data, updatedAt: new Date().toISOString() });
  const options = { blobHTTPHeaders: { blobContentType: "application/json" } };
  if (ifMatch) {
    options.conditions = { ifMatch };
  } else if (ifNoneMatch) {
    options.conditions = { ifNoneMatch };
  }
  const res = await container
    .getBlockBlobClient(BLOB)
    .upload(body, Buffer.byteLength(body), options);
  return res.etag;
}

app.http("roadmapGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "roadmap",
  handler: async (request, context) => {
    try {
      const { doc, etag } = await readRoadmap();
      return etag ? { jsonBody: doc, headers: { ETag: etag } } : { jsonBody: doc };
    } catch (err) {
      context.error("Failed to read roadmap", err);
      return { status: 500, jsonBody: { error: "Failed to read roadmap" } };
    }
  }
});

app.http("roadmapPut", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "roadmap",
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body" } };
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { status: 400, jsonBody: { error: "Body must be a roadmap object" } };
    }

    // Rollout guard: once the shared store has been upgraded to the multi-roadmap
    // shape, refuse a legacy flat write from an un-refreshed old client so it can
    // never overwrite (and lose) the multi-roadmap document.
    if (!Array.isArray(body.roadmaps)) {
      try {
        const { doc } = await readRoadmap();
        if (Array.isArray(doc.roadmaps) && doc.roadmaps.length > 0) {
          return { status: 409, jsonBody: { error: "Roadmap upgraded; refresh required" } };
        }
      } catch (err) {
        context.error("Rollout guard read failed", err);
      }
    }

    const ifMatch = request.headers.get("if-match");
    const ifNoneMatch = request.headers.get("if-none-match");
    try {
      const etag = await writeRoadmap(body, {
        ifMatch: ifMatch || undefined,
        ifNoneMatch: ifNoneMatch || undefined
      });
      return { status: 200, jsonBody: { ok: true }, headers: { ETag: etag } };
    } catch (err) {
      // Optimistic-concurrency conflict — the client re-fetches and retries.
      if (err && (err.statusCode === 412 || err.statusCode === 409)) {
        return { status: 412, jsonBody: { error: "Roadmap changed since last read" } };
      }
      context.error("Failed to write roadmap", err);
      return { status: 500, jsonBody: { error: "Failed to save roadmap" } };
    }
  }
});
