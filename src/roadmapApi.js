// Remote persistence client for the shared roadmap workspace document.
//
// When deployed to Azure Static Web Apps, /api/roadmap stores one shared JSON
// document (all roadmaps). Saves are guarded with the blob's ETag: if someone
// else wrote since we last read, the PUT returns 412 and we re-fetch, hand the
// fresh document to the store to merge per-roadmap, and retry with the new ETag.
//
// In local `npm run dev` there is no /api, so calls fail fast and the app falls
// back to localStorage (handled in taskStore.js). Nothing breaks.

const API_URL = "/api/roadmap";

let pushTimer = null;
let inFlight = false;
let pending = null;
let lastEtag = null;

// Returns { doc, etag } when the API is reachable, or null (local dev / offline).
export async function fetchRemoteRoadmap() {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc || typeof doc !== "object") return null;
    lastEtag = res.headers.get("etag") || lastEtag;
    return { doc, etag: lastEtag };
  } catch {
    return null;
  }
}

async function putDoc(payload, etag) {
  const headers = { "Content-Type": "application/json" };
  if (etag) {
    headers["If-Match"] = etag;
  } else {
    // No known version → only create if the blob does not already exist.
    headers["If-None-Match"] = "*";
  }
  const res = await fetch(API_URL, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status, etag: res.headers.get("etag") };
}

async function flush() {
  if (inFlight || !pending) return;
  const job = pending;
  pending = null;
  inFlight = true;
  try {
    let payload = job.getPayload();
    let result = await putDoc(payload, lastEtag);

    if (result.status === 412 || result.status === 409) {
      // Someone else wrote since we last read — merge their version and retry once.
      const fresh = await fetchRemoteRoadmap();
      if (fresh) {
        payload = job.onConflict ? job.onConflict(fresh.doc) : payload;
        result = await putDoc(payload, fresh.etag);
      }
    }

    if (result.ok) {
      if (result.etag) lastEtag = result.etag;
      if (job.onSuccess) job.onSuccess();
    }
  } catch {
    // Offline or no API — localStorage remains the source of truth.
  } finally {
    inFlight = false;
    if (pending) flush();
  }
}

// Debounced, ETag-guarded save. `onConflict(remoteDoc)` returns the merged
// payload to write; `onSuccess()` runs after a confirmed write.
export function pushRemoteRoadmap(getPayload, { debounceMs = 800, onConflict, onSuccess } = {}) {
  if (typeof fetch === "undefined") return;
  pending = { getPayload, onConflict, onSuccess };
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    flush();
  }, debounceMs);
}
