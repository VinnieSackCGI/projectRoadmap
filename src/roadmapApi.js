// Remote persistence client for the shared roadmap.
//
// When the app is deployed to Azure Static Web Apps, an /api/roadmap endpoint
// stores one shared copy of the roadmap (tasks + staffing) so everyone who opens
// the site sees and edits the same data.
//
// In local `npm run dev` there is no /api, so every call here fails fast and the
// app falls back to localStorage (handled in taskStore.js). Nothing breaks.

const API_URL = "/api/roadmap";

let pushTimer = null;
let inFlight = false;
let pendingPayload = null;

// Returns the shared roadmap document as-is — either the multi-roadmap shape
//   { roadmaps, data }  or the legacy single-roadmap shape { tasks, staffing, lanes }.
// Returns null when there is no API (local dev / offline); the store falls back
// to localStorage in that case.
export async function fetchRemoteRoadmap() {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

async function flush() {
  if (inFlight || !pendingPayload) return;
  const payload = pendingPayload;
  pendingPayload = null;
  inFlight = true;
  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Offline or no API — localStorage remains the source of truth.
  } finally {
    inFlight = false;
    if (pendingPayload) flush();
  }
}

// Debounced last-write-wins save of the whole roadmap document.
export function pushRemoteRoadmap(getPayload, { debounceMs = 800 } = {}) {
  if (typeof fetch === "undefined") return;
  pendingPayload = getPayload();
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    flush();
  }, debounceMs);
}
