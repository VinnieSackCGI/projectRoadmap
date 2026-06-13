// Single source of truth for tasks + staffing.
// Persists to localStorage today; designed so the persistence layer can be swapped
// for an Azure SQL / API client without changing call sites.
//
// Also exposes a `window.projectRoadmap` API so a future PM agent (in-page chat,
// Claude Agent SDK, or a browser-driven harness) can read and mutate the roadmap
// without touching React internals.

import { useSyncExternalStore } from "react";
import {
  initialStaffing,
  initialTasks,
  lanes as defaultLanes,
  TASK_ENTITY_TYPES,
  TIMELINE_END_DATE,
  TIMELINE_START_DATE,
  TASK_DEFAULTS
} from "./data";
import { fetchRemoteRoadmap, pushRemoteRoadmap } from "./roadmapApi";

const TASKS_KEY = "project-roadmap-tasks-v2";
const STAFF_KEY = "project-roadmap-staffing-v2";
const LANES_KEY = "project-roadmap-lanes-v1";
const LEGACY_TASKS_KEY = "regional-planning-react-tasks-v1";
const ROADMAP_DATE_SYNC_KEY = "project-roadmap-date-sync-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VALID_ENTITY_TYPES = new Set(TASK_ENTITY_TYPES);

const listeners = new Set();
let tasksState = [];
let staffingState = [];
// Seeded with the default lanes so early task normalization always has a valid
// set to validate against; overwritten from storage during init below.
let lanesState = defaultLanes.map((lane) => ({ ...lane }));

function safeSetItem(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Most likely a quota error (e.g. large embedded document data URLs).
    console.warn(`Could not persist ${key} to localStorage:`, error);
  }
}

export function getLanes() {
  return lanesState;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function quarterLabelToDate(quarterLabel, isEnd = false) {
  const match = /^FY(\d{2})\s*Q([1-4])$/i.exec((quarterLabel || "").trim());
  if (!match) {
    return null;
  }

  const fiscalYear = 2000 + Number(match[1]);
  const quarter = Number(match[2]);
  const startYear = quarter === 1 ? fiscalYear - 1 : fiscalYear;
  const startMonth = quarter === 1 ? 9 : quarter === 2 ? 0 : quarter === 3 ? 3 : 6;
  const start = new Date(Date.UTC(startYear, startMonth, 1));
  const end = new Date(Date.UTC(startYear, startMonth + 3, 0));
  return isEnd ? end : start;
}

function dateWithQuarterOffset(quarterLabel, offset, isEnd = false) {
  const start = quarterLabelToDate(quarterLabel, false);
  const end = quarterLabelToDate(quarterLabel, true);
  if (!start || !end) return null;

  const spanDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (spanDays <= 0) return null;

  if (isEnd) {
    const safeOffset = Number.isFinite(offset) ? clamp(offset, 0, 1) : 1;
    const dayIndex = clamp(Math.ceil(safeOffset * spanDays) - 1, 0, spanDays - 1);
    return new Date(start.getTime() + dayIndex * MS_PER_DAY);
  }

  const safeOffset = Number.isFinite(offset) ? clamp(offset, 0, 1) : 0;
  const dayIndex = clamp(Math.round(safeOffset * (spanDays - 1)), 0, spanDays - 1);
  return new Date(start.getTime() + dayIndex * MS_PER_DAY);
}

function normalizeTaskDateWindow(task) {
  let startDate = parseIsoDate(task.startDate);
  let endDate = parseIsoDate(task.endDate);

  if (!startDate) {
    startDate =
      dateWithQuarterOffset(task.start, task.startOffset, false) ||
      quarterLabelToDate(task.start, false);
  }

  if (!endDate) {
    const endQuarter = task.end || task.start;
    endDate =
      dateWithQuarterOffset(endQuarter, task.endOffset, true) ||
      quarterLabelToDate(endQuarter, true);
  }

  const timelineStart = parseIsoDate(TIMELINE_START_DATE) || new Date(Date.UTC(2025, 9, 1));
  const timelineEnd = parseIsoDate(TIMELINE_END_DATE) || new Date(Date.UTC(2028, 8, 30));

  if (!startDate) startDate = timelineStart;
  if (!endDate) endDate = startDate;
  if (endDate < startDate) endDate = new Date(startDate.getTime());

  if (startDate < timelineStart) startDate = timelineStart;
  if (startDate > timelineEnd) startDate = timelineEnd;
  if (endDate < timelineStart) endDate = timelineStart;
  if (endDate > timelineEnd) endDate = timelineEnd;
  if (endDate < startDate) endDate = new Date(startDate.getTime());

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate)
  };
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function generateId(prefix = "task") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function normalizeEntityType(value, fallback = "task") {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_ENTITY_TYPES.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function inferEntityType(task) {
  if (VALID_ENTITY_TYPES.has(task.entityType)) {
    return task.entityType;
  }
  if (!task.parentTaskId && !task.projectId && !task.epicId) {
    return "project";
  }
  return "task";
}

function withTaskDefaults(task, index = 0) {
  const merged = { ...TASK_DEFAULTS, ...task };
  if (!merged.id) {
    merged.id = `task-${index + 1}`;
  }
  merged.entityType = normalizeEntityType(merged.entityType, inferEntityType(merged));
  if (!lanesState.some((lane) => lane.key === merged.lane)) {
    merged.lane = lanesState[0]?.key || merged.lane;
  }
  // One-time migration: legacy `owners` free-text → ownerIds + externalOwners.
  if ((!merged.ownerIds || merged.ownerIds.length === 0) && merged.externalOwners === "" && merged.owners) {
    const known = new Map(initialStaffing.map((p) => [p.person.toLowerCase(), p.id]));
    const matched = [];
    const external = [];
    for (const piece of String(merged.owners).split(/[;,]/)) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      const id = known.get(trimmed.toLowerCase());
      if (id) {
        matched.push(id);
      } else {
        external.push(trimmed);
      }
    }
    merged.ownerIds = matched;
    merged.externalOwners = external.join("; ");
  }

  const normalizedDates = normalizeTaskDateWindow(merged);
  merged.startDate = normalizedDates.startDate;
  merged.endDate = normalizedDates.endDate;

  if (!parseIsoDate(merged.dueDate)) {
    merged.dueDate = merged.endDate;
  }

  return merged;
}

function normalizeHierarchyEntry(task, tasksById, cache, active = new Set()) {
  if (cache.has(task.id)) {
    return cache.get(task.id);
  }

  if (active.has(task.id)) {
    const fallback = {
      ...task,
      entityType: normalizeEntityType(task.entityType, inferEntityType(task))
    };
    cache.set(task.id, fallback);
    return fallback;
  }

  active.add(task.id);

  const entityType = normalizeEntityType(task.entityType, inferEntityType(task));
  let projectId = task.projectId || null;
  let epicId = task.epicId || null;
  let parentTaskId = task.parentTaskId || null;

  const rawParent = parentTaskId ? tasksById.get(parentTaskId) : null;
  const parent = rawParent
    ? normalizeHierarchyEntry(rawParent, tasksById, cache, active)
    : null;

  if (entityType === "project") {
    projectId = task.id;
    epicId = null;
    parentTaskId = null;
  } else if (entityType === "epic") {
    projectId = projectId || parent?.projectId || (parent?.entityType === "project" ? parent.id : null);
    epicId = task.id;
    parentTaskId = projectId || null;
  } else {
    if (parent?.entityType === "project") {
      projectId = projectId || parent.id;
      parentTaskId = parent.id;
    } else if (parent?.entityType === "epic") {
      projectId = projectId || parent.projectId || null;
      epicId = epicId || parent.id;
      parentTaskId = parent.id;
    } else if (parent) {
      projectId = projectId || parent.projectId || null;
      epicId = epicId || parent.epicId || null;
      parentTaskId = parent.id;
    } else {
      parentTaskId = epicId || projectId || null;
    }
  }

  const normalized = {
    ...task,
    entityType,
    projectId,
    epicId,
    parentTaskId
  };

  cache.set(task.id, normalized);
  active.delete(task.id);
  return normalized;
}

function normalizeTaskCollection(rawTasks) {
  const seeded = rawTasks.map(withTaskDefaults);
  const tasksById = new Map(seeded.map((task) => [task.id, task]));
  const cache = new Map();
  return seeded.map((task) => normalizeHierarchyEntry(task, tasksById, cache));
}

function canonicalRoadmapKey(task) {
  return [task.task, task.lane, task.bureau]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("::");
}

const canonicalRoadmapSchedule = new Map(
  normalizeTaskCollection(initialTasks).map((task) => [
    canonicalRoadmapKey(task),
    {
      start: task.start || null,
      end: task.end || null,
      startDate: task.startDate,
      endDate: task.endDate,
      dueDate: task.dueDate || task.endDate
    }
  ])
);

function syncStoredRoadmapDates(tasks) {
  let changed = false;

  const synced = tasks.map((task) => {
    const canonical = canonicalRoadmapSchedule.get(canonicalRoadmapKey(task));
    if (!canonical) {
      return task;
    }

    const next = {
      ...task,
      start: canonical.start ?? task.start,
      end: canonical.end ?? task.end,
      startDate: canonical.startDate,
      endDate: canonical.endDate,
      dueDate: canonical.dueDate
    };

    if (
      next.start !== task.start ||
      next.end !== task.end ||
      next.startDate !== task.startDate ||
      next.endDate !== task.endDate ||
      next.dueDate !== task.dueDate
    ) {
      changed = true;
      return next;
    }

    return task;
  });

  return {
    changed,
    tasks: changed ? normalizeTaskCollection(synced) : tasks
  };
}

function maybeSyncStoredRoadmapDates(tasks) {
  if (typeof window === "undefined") {
    return tasks;
  }

  if (window.localStorage.getItem(ROADMAP_DATE_SYNC_KEY)) {
    return tasks;
  }

  const result = syncStoredRoadmapDates(tasks);
  if (result.changed) {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(result.tasks));
  }
  window.localStorage.setItem(ROADMAP_DATE_SYNC_KEY, "1");
  return result.tasks;
}

function leafWorkItems(items = tasksState) {
  const parentIds = new Set(items.map((task) => task.parentTaskId).filter(Boolean));
  return items.filter((task) => !parentIds.has(task.id));
}

function loadTasksFromStorage() {
  if (typeof window === "undefined") {
    return normalizeTaskCollection(initialTasks);
  }

  const current = window.localStorage.getItem(TASKS_KEY);
  if (current) {
    const parsed = safeParse(current);
    if (parsed && parsed.length > 0) {
      return maybeSyncStoredRoadmapDates(normalizeTaskCollection(parsed));
    }
  }

  // One-time migration from the v1 local store.
  const legacy = window.localStorage.getItem(LEGACY_TASKS_KEY);
  if (legacy) {
    const parsed = safeParse(legacy);
    if (parsed && parsed.length > 0) {
      return maybeSyncStoredRoadmapDates(normalizeTaskCollection(parsed));
    }
  }

  return normalizeTaskCollection(initialTasks);
}

function loadStaffingFromStorage() {
  if (typeof window === "undefined") {
    return initialStaffing;
  }
  const raw = window.localStorage.getItem(STAFF_KEY);
  if (raw) {
    const parsed = safeParse(raw);
    if (parsed && parsed.length > 0) {
      return parsed;
    }
  }
  return initialStaffing;
}

function persistTasks() {
  persistTasksLocal();
  schedulePush();
}

function persistTasksLocal() {
  safeSetItem(TASKS_KEY, JSON.stringify(tasksState));
}

function loadLanesFromStorage() {
  if (typeof window === "undefined") {
    return defaultLanes.map((lane) => ({ ...lane }));
  }
  const raw = window.localStorage.getItem(LANES_KEY);
  if (raw) {
    const parsed = safeParse(raw);
    if (parsed && parsed.length > 0) {
      return parsed
        .filter((lane) => lane && lane.key)
        .map((lane) => ({ key: String(lane.key), caption: String(lane.caption || "") }));
    }
  }
  return defaultLanes.map((lane) => ({ ...lane }));
}

function persistLanes() {
  safeSetItem(LANES_KEY, JSON.stringify(lanesState));
}

function persistStaffing() {
  persistStaffingLocal();
  schedulePush();
}

function persistStaffingLocal() {
  safeSetItem(STAFF_KEY, JSON.stringify(staffingState));
}

// --- Shared-roadmap sync (Azure Static Web Apps /api/roadmap) ---
// remoteAvailable stays false during local `npm run dev` (no API), so the app
// behaves exactly as before and persists to localStorage only.
let remoteAvailable = false;

function schedulePush() {
  if (!remoteAvailable) return;
  pushRemoteRoadmap(() => ({ tasks: tasksState, staffing: staffingState }));
}

async function hydrateFromRemote() {
  const remote = await fetchRemoteRoadmap();
  if (!remote) {
    // No API reachable (local dev / offline) — stay in localStorage-only mode.
    return;
  }

  remoteAvailable = true;
  let changed = false;
  let remoteWasEmpty = true;

  if (remote.tasks.length > 0) {
    tasksState = normalizeTaskCollection(remote.tasks);
    persistTasksLocal();
    changed = true;
    remoteWasEmpty = false;
  }

  if (remote.staffing.length > 0) {
    staffingState = remote.staffing;
    persistStaffingLocal();
    changed = true;
    remoteWasEmpty = false;
  }

  if (remoteWasEmpty) {
    // First deploy: seed the shared store from whatever this client has.
    schedulePush();
  }

  if (changed) emit();
}

function emit() {
  listeners.forEach((fn) => fn());
}

lanesState = loadLanesFromStorage();
tasksState = loadTasksFromStorage();
staffingState = loadStaffingFromStorage();

if (typeof window !== "undefined") {
  // Pull the shared copy (and seed it on first deploy). Safe no-op in local dev.
  hydrateFromRemote();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTasks() {
  return tasksState;
}

export function getProjects() {
  return tasksState.filter((task) => task.entityType === "project");
}

export function getEpics() {
  return tasksState.filter((task) => task.entityType === "epic");
}

export function getTaskItems() {
  return tasksState.filter((task) => task.entityType === "task");
}

export function getStaffing() {
  return staffingState;
}

export function getTask(id) {
  return tasksState.find((task) => task.id === id) || null;
}

export function getSubtasks(parentId) {
  return tasksState.filter((task) => task.parentTaskId === parentId);
}

export function createTask(partial = {}) {
  const nextId = partial.id || generateId(normalizeEntityType(partial.entityType, "task"));
  const next = withTaskDefaults({
    ...partial,
    id: nextId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  tasksState = normalizeTaskCollection([...tasksState, next]);
  persistTasks();
  emit();
  return tasksState.find((task) => task.id === nextId) || null;
}

export function updateTask(id, patch = {}) {
  let updated = null;
  const nextState = tasksState.map((task) => {
    if (task.id !== id) return task;
    updated = {
      ...task,
      ...patch,
      id: task.id,
      updatedAt: new Date().toISOString()
    };
    return updated;
  });
  if (updated) {
    tasksState = normalizeTaskCollection(nextState);
    updated = tasksState.find((task) => task.id === id) || updated;
    persistTasks();
    emit();
  }
  return updated;
}

export function deleteTask(id) {
  const before = tasksState.length;
  const idsToDelete = new Set([id]);

  let changed = true;
  while (changed) {
    changed = false;
    tasksState.forEach((task) => {
      if (!idsToDelete.has(task.id) && task.parentTaskId && idsToDelete.has(task.parentTaskId)) {
        idsToDelete.add(task.id);
        changed = true;
      }
    });
  }

  tasksState = tasksState.filter((task) => !idsToDelete.has(task.id));
  if (tasksState.length !== before) {
    persistTasks();
    emit();
  }
}

export function replaceStaffing(next) {
  if (!Array.isArray(next)) return;
  staffingState = next;
  persistStaffing();
  emit();
}

// --- Task flags (At Risk / Scope Unclear) ---

export function getOpenFlags(task) {
  return (Array.isArray(task?.flags) ? task.flags : []).filter(
    (flag) => flag && flag.status !== "resolved"
  );
}

export function addTaskFlag(taskId, flag = {}) {
  const task = getTask(taskId);
  if (!task) return null;
  const entry = {
    id: generateId("flag"),
    type: flag.type || "At Risk",
    note: (flag.note || "").trim(),
    status: "open",
    createdAt: new Date().toISOString(),
    createdBy: flag.createdBy || "Current user",
    resolutionNote: "",
    resolvedAt: null,
    resolvedBy: null
  };
  const flags = Array.isArray(task.flags) ? task.flags : [];
  return updateTask(taskId, { flags: [...flags, entry] });
}

export function resolveTaskFlag(taskId, flagId, resolutionNote, resolvedBy = "Current user") {
  const task = getTask(taskId);
  if (!task) return null;
  const note = (resolutionNote || "").trim();
  // A resolution note is required — no silent close.
  if (!note) return null;
  const flags = (Array.isArray(task.flags) ? task.flags : []).map((flag) =>
    flag.id === flagId
      ? {
          ...flag,
          status: "resolved",
          resolutionNote: note,
          resolvedAt: new Date().toISOString(),
          resolvedBy
        }
      : flag
  );
  return updateTask(taskId, { flags });
}

// --- Local backup: export / import the whole roadmap ---

export function exportRoadmap() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks: getTasks(),
    staffing: getStaffing()
  };
}

export function importRoadmap(payload) {
  if (!payload || typeof payload !== "object") return false;
  const nextTasks = Array.isArray(payload.tasks) ? payload.tasks : null;
  const nextStaffing = Array.isArray(payload.staffing) ? payload.staffing : null;
  if (!nextTasks && !nextStaffing) return false;
  if (nextTasks) {
    tasksState = normalizeTaskCollection(nextTasks);
    persistTasks();
  }
  if (nextStaffing) {
    staffingState = nextStaffing;
    persistStaffing();
  }
  emit();
  return true;
}

// --- Swim lane management (PM/Admin) ---

export function addLane({ key, caption } = {}) {
  const trimmed = (key || "").trim();
  if (!trimmed) return false;
  if (lanesState.some((lane) => lane.key.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  lanesState = [...lanesState, { key: trimmed, caption: (caption || "").trim() }];
  persistLanes();
  emit();
  return true;
}

export function renameLane(oldKey, { key, caption } = {}) {
  const trimmed = (key || "").trim();
  if (!trimmed) return false;
  const existing = lanesState.find((lane) => lane.key === oldKey);
  if (!existing) return false;
  if (
    trimmed.toLowerCase() !== oldKey.toLowerCase() &&
    lanesState.some((lane) => lane.key.toLowerCase() === trimmed.toLowerCase())
  ) {
    return false;
  }
  lanesState = lanesState.map((lane) =>
    lane.key === oldKey
      ? { key: trimmed, caption: caption !== undefined ? caption : lane.caption }
      : lane
  );
  if (trimmed !== oldKey) {
    tasksState = tasksState.map((task) =>
      task.lane === oldKey ? { ...task, lane: trimmed } : task
    );
    persistTasksLocal();
  }
  persistLanes();
  emit();
  return true;
}

// Removes the lane and every task/subtask assigned to it.
export function removeLane(key) {
  if (lanesState.length <= 1) return false;
  if (!lanesState.some((lane) => lane.key === key)) return false;
  lanesState = lanesState.filter((lane) => lane.key !== key);
  const before = tasksState.length;
  tasksState = tasksState.filter((task) => task.lane !== key);
  if (tasksState.length !== before) {
    persistTasksLocal();
  }
  persistLanes();
  emit();
  return true;
}

// --- Task documents (local pilot storage as data URLs) ---

export function addTaskDocument(taskId, doc = {}) {
  const task = getTask(taskId);
  if (!task) return null;
  const entry = {
    id: generateId("doc"),
    name: doc.name || "Untitled",
    size: Number(doc.size) || 0,
    type: doc.type || "",
    dataUrl: doc.dataUrl || "",
    uploadedAt: new Date().toISOString(),
    uploadedBy: doc.uploadedBy || "Current user"
  };
  const documents = Array.isArray(task.documents) ? task.documents : [];
  return updateTask(taskId, { documents: [...documents, entry] });
}

export function removeTaskDocument(taskId, docId) {
  const task = getTask(taskId);
  if (!task) return null;
  const documents = (Array.isArray(task.documents) ? task.documents : []).filter(
    (doc) => doc.id !== docId
  );
  return updateTask(taskId, { documents });
}

// --- Risk + burnout heuristics (used by UI badges and by the PM agent) ---

export function assessTaskRisk(task) {
  const reasons = [];
  let score = 0;
  const owners = resolveTaskOwners(task);

  const risk = (task.riskLevel || "").toLowerCase();
  if (risk === "high") {
    score += 3;
    reasons.push("Risk level marked High");
  } else if (risk === "medium") {
    score += 1;
    reasons.push("Risk level marked Medium");
  }

  if (/inferred|conflicting|needs validation/i.test(task.confidence || "")) {
    score += 1;
    reasons.push("Timing confidence is low");
  }

  if (
    (owners.staff.length === 0 && owners.external.length === 0) ||
    /not explicit|tbd/i.test(task.owners || task.externalOwners || "")
  ) {
    score += 1;
    reasons.push("No clear owner assigned");
  }

  const status = (task.status || "").toLowerCase();
  if (status === "blocked") {
    score += 2;
    reasons.push("Task is Blocked");
  }

  const start = parseIsoDate(task.startDate);
  const end = parseIsoDate(task.endDate);
  const spanDays = start && end ? Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1 : 0;
  if (spanDays > 365 && status !== "done") {
    score += 1;
    reasons.push("Spans more than one year");
  }

  let level = "Low";
  if (score >= 4) level = "High";
  else if (score >= 2) level = "Medium";

  return { level, score, reasons };
}

export function getStaffById(id) {
  return staffingState.find((person) => person.id === id) || null;
}

export function resolveTaskOwners(task) {
  const ids = Array.isArray(task.ownerIds) ? task.ownerIds : [];
  const staff = ids
    .map((id) => getStaffById(id))
    .filter(Boolean);
  const external = (task.externalOwners || "")
    .split(/[;,]/)
    .map((name) => name.trim())
    .filter(Boolean);
  return { staff, external };
}

export function assessStaffBurnout(staffing = staffingState, tasks = tasksState) {
  const activeTasks = leafWorkItems(tasks).filter(
    (task) => (task.status || "").toLowerCase() !== "done"
  );

  return staffing.map((person) => {
    const matches = activeTasks.filter((task) => {
      if (Array.isArray(task.ownerIds) && task.ownerIds.includes(person.id)) {
        return true;
      }
      // Fallback for any unmigrated legacy owners string.
      return (task.owners || "")
        .split(/[;,]/)
        .map((name) => name.trim())
        .filter(Boolean)
        .includes(person.person);
    });

    const totalEffort = matches.reduce(
      (sum, task) => sum + (Number(task.estimatedEffortHours) || 0),
      0
    );
    const declared = Number(person.allocationPercent) || 0;
    const capacityHours = Number(person.weeklyCapacityHours) || 40;

    let level = "Healthy";
    const reasons = [];
    if (declared >= 100) {
      level = "Overloaded";
      reasons.push(`Declared allocation at ${declared}%`);
    } else if (declared >= 85) {
      level = "Stretched";
      reasons.push(`Declared allocation at ${declared}%`);
    }

    if (matches.length >= 5) {
      if (level === "Healthy") level = "Stretched";
      reasons.push(`Owns ${matches.length} active tasks`);
    }

    return {
      person: person.person,
      role: person.role,
      activeTaskIds: matches.map((task) => task.id),
      activeTaskCount: matches.length,
      totalEstimatedHours: totalEffort,
      weeklyCapacityHours: capacityHours,
      declaredAllocationPercent: declared,
      level,
      reasons
    };
  });
}

// --- React bindings ---

export function useTasks() {
  return useSyncExternalStore(subscribe, getTasks, getTasks);
}

export function useProjects() {
  return useSyncExternalStore(subscribe, getProjects, getProjects);
}

export function useEpics() {
  return useSyncExternalStore(subscribe, getEpics, getEpics);
}

export function useTaskItems() {
  return useSyncExternalStore(subscribe, getTaskItems, getTaskItems);
}

export function useStaffing() {
  return useSyncExternalStore(subscribe, getStaffing, getStaffing);
}

export function useLanes() {
  return useSyncExternalStore(subscribe, getLanes, getLanes);
}

// --- Agent surface ---
// A future PM agent can call these from the browser console or via an injected
// chat panel. Keep the surface narrow and JSON-friendly.
if (typeof window !== "undefined") {
  window.projectRoadmap = {
    listTasks: () => getTasks().map((task) => ({ ...task })),
    listProjects: () => getProjects().map((task) => ({ ...task })),
    listEpics: () => getEpics().map((task) => ({ ...task })),
    listTaskItems: () => getTaskItems().map((task) => ({ ...task })),
    getTask: (id) => {
      const task = getTask(id);
      return task ? { ...task } : null;
    },
    getSubtasks: (parentId) => getSubtasks(parentId).map((task) => ({ ...task })),
    createTask,
    updateTask,
    deleteTask,
    listStaffing: () => getStaffing().map((person) => ({ ...person })),
    getStaffById: (id) => {
      const staff = getStaffById(id);
      return staff ? { ...staff } : null;
    },
    resolveTaskOwners: (idOrTask) => {
      const task = typeof idOrTask === "string" ? getTask(idOrTask) : idOrTask;
      return task ? resolveTaskOwners(task) : { staff: [], external: [] };
    },
    replaceStaffing,
    addTaskFlag,
    resolveTaskFlag,
    addTaskDocument,
    removeTaskDocument,
    listLanes: () => getLanes().map((lane) => ({ ...lane })),
    addLane,
    renameLane,
    removeLane,
    exportRoadmap,
    importRoadmap,
    assessTaskRisk: (idOrTask) => {
      const task = typeof idOrTask === "string" ? getTask(idOrTask) : idOrTask;
      return task ? assessTaskRisk(task) : null;
    },
    assessBurnout: () => assessStaffBurnout(),
    refresh: () => hydrateFromRemote(),
    timelineStartDate: TIMELINE_START_DATE,
    timelineEndDate: TIMELINE_END_DATE,
    lanes: getLanes().map((lane) => ({ ...lane }))
  };
}
