import React, { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "./AppHeader";
import TaskEditorModal from "./TaskEditorModal";
import { bureauStyles, TASK_STATUSES } from "./data";
import {
  assessTaskRisk,
  createTask as storeCreateTask,
  deleteTask as storeDeleteTask,
  exportRoadmap,
  getLanes,
  importRoadmap,
  resolveTaskOwners,
  updateTask as storeUpdateTask,
  useLanes,
  useStaffing,
  useTasks
} from "./taskStore";
import {
  createEmptyWorkItemDraft,
  formatDateLabel,
  titleCase
} from "./workItemUtils";
import useWorkItemEditor from "./useWorkItemEditor";
import HelpLink from "./HelpLink";
import backgroundImage from "../design/dos wave background.jpg";

const RISK_RANK = { Low: 0, Medium: 1, High: 2 };

function sortValue(task, key) {
  switch (key) {
    case "name":
      return (task.task || "").toLowerCase();
    case "type":
      return (task.entityType || "").toLowerCase();
    case "owners": {
      const { staff, external } = resolveTaskOwners(task);
      return [...staff.map((p) => p.person), ...external].join(", ").toLowerCase();
    }
    case "bureau":
      return (task.bureau || "").toLowerCase();
    case "lane":
      return (task.lane || "").toLowerCase();
    case "due":
      return task.dueDate || "";
    case "status":
      return (task.status || "Planned").toLowerCase();
    case "risk":
      return RISK_RANK[assessTaskRisk(task).level] ?? 0;
    case "window":
    default:
      return task.startDate || "";
  }
}

function statusClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "blocked") return "status-pill status-blocked";
  if (value === "in progress") return "status-pill status-in-progress";
  if (value === "done") return "status-pill status-done";
  return "status-pill";
}

function riskClass(level) {
  const value = (level || "").toLowerCase();
  if (value === "high") return "risk-pill risk-high";
  if (value === "medium") return "risk-pill risk-medium";
  return "risk-pill";
}

function createEmptyDraft() {
  return createEmptyWorkItemDraft({
    lane: getLanes()[0]?.key,
    bureau: Object.keys(bureauStyles)[0],
    fallbackDate: new Date().toISOString().slice(0, 10)
  });
}

const INITIAL_FILTERS = {
  task: "",
  owners: "",
  bureau: "All",
  lane: "All",
  startFrom: "",
  endTo: "",
  dueBy: "",
  status: "All",
  risk: "All"
};

export default function TasksPage() {
  const tasks = useTasks();
  const staffing = useStaffing();
  const lanes = useLanes();
  const bureauOptions = useMemo(
    () => [...new Set([...Object.keys(bureauStyles), ...tasks.map((task) => task.bureau)])],
    [tasks]
  );

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sort, setSort] = useState({ key: "window", dir: "asc" });
  const fileInputRef = useRef(null);

  const toggleSort = useCallback((key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(exportRoadmap(), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roadmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportFile = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (!importRoadmap(payload)) {
          window.alert("That file did not contain a valid roadmap backup.");
        }
      } catch {
        window.alert("Could not read that file as JSON.");
      }
    };
    reader.readAsText(file);
  }, []);

  const {
    closeEditor,
    deleteDraftTask,
    draft,
    editorMode,
    epicOptions,
    isEditorOpen,
    openCreateEditor,
    openEditEditor,
    projectOptions,
    saveDraft,
    updateDraft,
    validationError
  } = useWorkItemEditor({
    tasks,
    createEmptyDraft,
    onCreate: storeCreateTask,
    onUpdate: storeUpdateTask,
    onDelete: storeDeleteTask
  });

  const filteredTasks = useMemo(() => {
    const normalizedTask = filters.task.trim().toLowerCase();
    const normalizedOwners = filters.owners.trim().toLowerCase();

    return tasks.filter((task) => {
      const risk = assessTaskRisk(task);
      const { staff, external } = resolveTaskOwners(task);
      const ownerLabel = [
        ...staff.map((person) => person.person),
        ...external
      ].join(", ").toLowerCase();

      if (normalizedTask && !(task.task || "").toLowerCase().includes(normalizedTask)) {
        return false;
      }

      if (normalizedOwners && !ownerLabel.includes(normalizedOwners)) {
        return false;
      }

      if (filters.bureau !== "All" && task.bureau !== filters.bureau) {
        return false;
      }

      if (filters.lane !== "All" && task.lane !== filters.lane) {
        return false;
      }

      if (filters.startFrom && (task.startDate || "") < filters.startFrom) {
        return false;
      }

      if (filters.endTo && (task.endDate || "") > filters.endTo) {
        return false;
      }

      if (filters.dueBy) {
        if (!task.dueDate || task.dueDate > filters.dueBy) {
          return false;
        }
      }

      if (filters.status !== "All" && (task.status || "Planned") !== filters.status) {
        return false;
      }

      if (filters.risk !== "All" && risk.level !== filters.risk) {
        return false;
      }

      return true;
    });
  }, [filters, tasks]);

  const sortedTasks = useMemo(() => {
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filteredTasks].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return (a.task || "").localeCompare(b.task || "");
    });
  }, [filteredTasks, sort]);

  const updateFilter = useCallback((field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell">
        <section className="card page-panel">
          <div className="task-page-header">
            <div>
              <div className="section-title">Work Items</div>
              <h2>Work Register</h2>
            </div>
            <div className="task-page-actions">
              <HelpLink section="work-items" />
              <button type="button" className="primary-btn" onClick={openCreateEditor}>
                Add Work Item
              </button>
              <button type="button" className="secondary-btn" onClick={clearFilters}>
                Clear Filters
              </button>
              <button type="button" className="secondary-btn" onClick={handleExport}>
                Export
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="visually-hidden-input"
                onChange={handleImportFile}
              />
            </div>
          </div>
          <p className="note">
            Live portfolio register across projects, epics, and tasks. Click a column heading to
            sort. Use Export to download a local backup, or Import to restore one.
          </p>
          <p className="note task-count-note">
            Showing {sortedTasks.length} of {tasks.length} work items.
          </p>
          <div className="table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  {[
                    { key: "name", label: "Name" },
                    { key: "type", label: "Type" },
                    { key: "owners", label: "Owners" },
                    { key: "bureau", label: "Bureau" },
                    { key: "lane", label: "Swim lane" },
                    { key: "window", label: "Window" },
                    { key: "due", label: "Due" },
                    { key: "status", label: "Status" },
                    { key: "risk", label: "Risk" }
                  ].map((column) => (
                    <th
                      key={column.key}
                      aria-sort={
                        sort.key === column.key
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className={`th-sort ${sort.key === column.key ? "active" : ""}`}
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.label}
                        <span className="th-sort-arrow" aria-hidden="true">
                          {sort.key === column.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
                <tr className="task-filter-row">
                  <th>
                    <input
                      className="task-filter-input"
                      type="text"
                      placeholder="Filter item"
                      value={filters.task}
                      onChange={(event) => updateFilter("task", event.target.value)}
                    />
                  </th>
                  <th />
                  <th>
                    <input
                      className="task-filter-input"
                      type="text"
                      placeholder="Filter owners"
                      value={filters.owners}
                      onChange={(event) => updateFilter("owners", event.target.value)}
                    />
                  </th>
                  <th>
                    <select
                      className="task-filter-select"
                      value={filters.bureau}
                      onChange={(event) => updateFilter("bureau", event.target.value)}
                    >
                      <option value="All">All bureaus</option>
                      {bureauOptions.map((bureau) => (
                        <option key={bureau} value={bureau}>{bureau}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select
                      className="task-filter-select"
                      value={filters.lane}
                      onChange={(event) => updateFilter("lane", event.target.value)}
                    >
                      <option value="All">All lanes</option>
                      {lanes.map((lane) => (
                        <option key={lane.key} value={lane.key}>{lane.key}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <div className="task-filter-date-stack">
                      <input
                        className="task-filter-input"
                        type="date"
                        value={filters.startFrom}
                        onChange={(event) => updateFilter("startFrom", event.target.value)}
                        aria-label="Start date on or after"
                      />
                      <input
                        className="task-filter-input"
                        type="date"
                        value={filters.endTo}
                        onChange={(event) => updateFilter("endTo", event.target.value)}
                        aria-label="End date on or before"
                      />
                    </div>
                  </th>
                  <th>
                    <input
                      className="task-filter-input"
                      type="date"
                      value={filters.dueBy}
                      onChange={(event) => updateFilter("dueBy", event.target.value)}
                      aria-label="Due by date"
                    />
                  </th>
                  <th>
                    <select
                      className="task-filter-select"
                      value={filters.status}
                      onChange={(event) => updateFilter("status", event.target.value)}
                    >
                      <option value="All">All statuses</option>
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select
                      className="task-filter-select"
                      value={filters.risk}
                      onChange={(event) => updateFilter("risk", event.target.value)}
                    >
                      <option value="All">All risk</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </th>
                  <th className="task-actions-cell">
                    <button
                      type="button"
                      className="secondary-btn table-clear-btn"
                      onClick={clearFilters}
                    >
                      Reset
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td className="task-empty-cell" colSpan={10}>
                      No work items match the current filters.
                    </td>
                  </tr>
                ) : sortedTasks.map((task) => {
                  const risk = assessTaskRisk(task);
                  const { staff, external } = resolveTaskOwners(task);
                  const ownerLabel = [
                    ...staff.map((p) => p.person),
                    ...external
                  ].join(", ") || "—";
                  return (
                    <tr key={task.id}>
                      <td>
                        <Link className="table-link" to={`/tasks/${task.id}`}>
                          {task.task}
                        </Link>
                      </td>
                      <td>{titleCase(task.entityType)}</td>
                      <td>{ownerLabel}</td>
                      <td>{task.bureau}</td>
                      <td>{task.lane}</td>
                      <td>{formatDateLabel(task.startDate)} to {formatDateLabel(task.endDate)}</td>
                      <td>{formatDateLabel(task.dueDate) || "—"}</td>
                      <td>
                        <span className={statusClass(task.status)}>
                          {task.status || "Planned"}
                        </span>
                      </td>
                      <td>
                        <span className={riskClass(risk.level)} title={risk.reasons.join("; ")}>
                          {risk.level}
                        </span>
                      </td>
                      <td className="task-actions-cell">
                        <button
                          type="button"
                          className="secondary-btn table-edit-btn"
                          onClick={() => openEditEditor(task)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <TaskEditorModal
        open={isEditorOpen}
        mode={editorMode}
        draft={draft}
        lanes={lanes}
        bureauOptions={bureauOptions}
        staffing={staffing}
        projectOptions={projectOptions}
        epicOptions={epicOptions}
        onChange={updateDraft}
        onCancel={closeEditor}
        onSave={saveDraft}
        onDelete={deleteDraftTask}
        validationError={validationError}
      />
    </div>
  );
}
