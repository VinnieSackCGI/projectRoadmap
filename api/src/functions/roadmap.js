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

async function readRoadmap() {
  const blob = getContainerClient().getBlockBlobClient(BLOB);
  if (!(await blob.exists())) {
    return { tasks: [], staffing: [], lanes: [] };
  }
  const buffer = await blob.downloadToBuffer();
  try {
    const parsed = JSON.parse(buffer.toString("utf8"));
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      staffing: Array.isArray(parsed.staffing) ? parsed.staffing : [],
      lanes: Array.isArray(parsed.lanes) ? parsed.lanes : []
    };
  } catch {
    return { tasks: [], staffing: [], lanes: [] };
  }
}

async function writeRoadmap(data) {
  const container = getContainerClient();
  await container.createIfNotExists();
  const body = JSON.stringify({
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    staffing: Array.isArray(data.staffing) ? data.staffing : [],
    lanes: Array.isArray(data.lanes) ? data.lanes : [],
    updatedAt: new Date().toISOString()
  });
  await container
    .getBlockBlobClient(BLOB)
    .upload(body, Buffer.byteLength(body), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });
}

app.http("roadmapGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "roadmap",
  handler: async (request, context) => {
    try {
      return { jsonBody: await readRoadmap() };
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
    try {
      await writeRoadmap(body);
      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error("Failed to write roadmap", err);
      return { status: 500, jsonBody: { error: "Failed to save roadmap" } };
    }
  }
});
