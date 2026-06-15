import { TIMELINE_END_DATE, TIMELINE_START_DATE } from "./data";

export function parseIsoDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function normalizeDateString(
  value,
  {
    fallback = TIMELINE_START_DATE,
    min = TIMELINE_START_DATE,
    max = TIMELINE_END_DATE
  } = {}
) {
  const parsed =
    parseIsoDate(value) ||
    parseIsoDate(fallback) ||
    parseIsoDate(TIMELINE_START_DATE);

  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  if (minDate && parsed < minDate) {
    return toIsoDate(minDate);
  }

  if (maxDate && parsed > maxDate) {
    return toIsoDate(maxDate);
  }

  return toIsoDate(parsed);
}

export function formatDateLabel(value, emptyLabel = "Not set") {
  if (!value) {
    return emptyLabel;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function sortMilestones(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99")
  );
}

export function summarizeMilestones(task, todayIso = todayIsoDate()) {
  const list = Array.isArray(task.milestones) ? task.milestones : [];
  const total = list.length;
  const done = list.filter((milestone) => milestone.done).length;
  const overdue = list.filter(
    (milestone) => !milestone.done && milestone.date && milestone.date < todayIso
  ).length;
  const upcoming =
    sortMilestones(
      list.filter((milestone) => !milestone.done && (!milestone.date || milestone.date >= todayIso))
    )[0] || null;
  return { total, done, open: total - done, overdue, upcoming };
}

export function createEmptyWorkItemDraft({ lane, bureau, fallbackDate } = {}) {
  const normalizedDate = normalizeDateString(fallbackDate || TIMELINE_START_DATE);

  return {
    entityType: "task",
    task: "",
    lane: lane || "",
    bureau: bureau || "",
    startDate: normalizedDate,
    endDate: normalizedDate,
    milestone: "",
    owners: "",
    confidence: "Inferred from roadmap layout",
    source: "Regional Plan + Regionals Outlook",
    description: "",
    status: "Planned",
    priority: "Medium",
    riskLevel: "Low",
    dueDate: "",
    estimatedEffortHours: 0,
    appLink: "",
    userGroup: "",
    parentTaskId: null,
    projectId: null,
    epicId: null,
    ownerIds: [],
    externalOwners: ""
  };
}

export function updateWorkItemDraft(previous, field, value) {
  const next = { ...previous, [field]: value };

  next.startDate = normalizeDateString(next.startDate, {
    fallback: TIMELINE_START_DATE,
    min: TIMELINE_START_DATE,
    max: TIMELINE_END_DATE
  });
  next.endDate = normalizeDateString(next.endDate || next.startDate, {
    fallback: next.startDate,
    min: TIMELINE_START_DATE,
    max: TIMELINE_END_DATE
  });

  const startDate = parseIsoDate(next.startDate);
  const endDate = parseIsoDate(next.endDate);

  if (startDate && endDate && endDate < startDate) {
    if (field === "startDate") {
      next.endDate = next.startDate;
    } else {
      next.startDate = next.endDate;
    }
  }

  return next;
}

export function prepareWorkItemDraftForSave(draft) {
  const taskName = (draft.task || "").trim();
  const owners = (draft.owners || "").trim();
  const confidence = (draft.confidence || "").trim();
  const source = (draft.source || "").trim();
  const normalizedStart = normalizeDateString(draft.startDate, {
    fallback: TIMELINE_START_DATE,
    min: TIMELINE_START_DATE,
    max: TIMELINE_END_DATE
  });
  const normalizedEnd = normalizeDateString(draft.endDate || draft.startDate, {
    fallback: normalizedStart,
    min: TIMELINE_START_DATE,
    max: TIMELINE_END_DATE
  });
  const startDate = parseIsoDate(normalizedStart);
  const endDate = parseIsoDate(normalizedEnd);

  if (!taskName) {
    return { error: "Task name is required." };
  }

  if (!startDate || !endDate) {
    return { error: "Start and end dates are required." };
  }

  if (endDate < startDate) {
    return { error: "End date cannot be before start date." };
  }

  return {
    value: {
      ...draft,
      task: taskName,
      owners,
      confidence,
      source,
      startDate: normalizedStart,
      endDate: normalizedEnd
    }
  };
}