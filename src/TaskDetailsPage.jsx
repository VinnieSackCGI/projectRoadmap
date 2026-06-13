import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "./AppHeader";
import TaskEditorModal from "./TaskEditorModal";
import { bureauStyles } from "./data";
import {
  assessTaskRisk,
  createTask as storeCreateTask,
  deleteTask as storeDeleteTask,
  getLanes,
  getSubtasks,
  resolveTaskOwners,
  updateTask as storeUpdateTask,
  useLanes,
  useStaffing,
  useTasks
} from "./taskStore";
import TaskFlags from "./TaskFlags";
import TaskDocuments from "./TaskDocuments";
import {
  createEmptyWorkItemDraft,
  formatDateLabel,
  parseIsoDate,
  titleCase
} from "./workItemUtils";
import useWorkItemEditor from "./useWorkItemEditor";
import backgroundImage from "../design/dos wave background.jpg";

function createEmptyDraft() {
  return createEmptyWorkItemDraft({
    lane: getLanes()[0]?.key,
    bureau: Object.keys(bureauStyles)[0]
  });
}

function rollupProgress(parent, subtasks) {
  if (!subtasks.length) {
    return null;
  }
  const totalWeight = subtasks.reduce(
    (sum, sub) => sum + (Number(sub.estimatedEffortHours) || 0),
    0
  );
  if (totalWeight === 0) {
    const done = subtasks.filter((sub) => (sub.status || "").toLowerCase() === "done").length;
    return Math.round((done / subtasks.length) * 100);
  }
  const weighted = subtasks.reduce((sum, sub) => {
    const weight = Number(sub.estimatedEffortHours) || 0;
    const status = (sub.status || "").toLowerCase();
    const fraction =
      status === "done" ? 1 : status === "in progress" ? 0.5 : 0;
    return sum + weight * fraction;
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}

function miniStatusClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "blocked") return "mini-bar-blocked";
  if (value === "in progress") return "mini-bar-progress";
  if (value === "done") return "mini-bar-done";
  return "mini-bar-planned";
}

function SubtaskTimeline({ parent, subtasks }) {
  const items = [parent, ...subtasks];
  const starts = items.map((item) => parseIsoDate(item.startDate)).filter(Boolean);
  const ends = items.map((item) => parseIsoDate(item.endDate)).filter(Boolean);
  if (!starts.length || !ends.length) {
    return null;
  }
  const winStart = Math.min(...starts.map((date) => date.getTime()));
  const winEnd = Math.max(...ends.map((date) => date.getTime()));
  const span = Math.max(1, winEnd - winStart);
  const layout = (task) => {
    const start = parseIsoDate(task.startDate)?.getTime() ?? winStart;
    const end = parseIsoDate(task.endDate)?.getTime() ?? start;
    const left = ((start - winStart) / span) * 100;
    const width = Math.max(2, ((end - start) / span) * 100);
    return { left, width: Math.min(width, 100 - left) };
  };

  return (
    <div className="mini-roadmap">
      {subtasks.map((sub) => {
        const { left, width } = layout(sub);
        return (
          <div className="mini-row" key={sub.id}>
            <Link className="mini-label table-link" to={`/tasks/${sub.id}`}>{sub.task}</Link>
            <div className="mini-track">
              <div
                className={`mini-bar ${miniStatusClass(sub.status)}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${formatDateLabel(sub.startDate)} – ${formatDateLabel(sub.endDate)}`}
              >
                <span>{sub.status || "Planned"}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TaskDetailsPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const tasks = useTasks();
  const staffing = useStaffing();
  const lanes = useLanes();
  const bureauOptions = useMemo(
    () => [...new Set([...Object.keys(bureauStyles), ...tasks.map((entry) => entry.bureau)])],
    [tasks]
  );

  const task = useMemo(
    () => tasks.find((item) => item.id === taskId) || null,
    [tasks, taskId]
  );
  const project = useMemo(
    () => (task?.projectId ? tasks.find((item) => item.id === task.projectId) || null : null),
    [task, tasks]
  );
  const epic = useMemo(
    () => (task?.epicId ? tasks.find((item) => item.id === task.epicId) || null : null),
    [task, tasks]
  );
  const subtasks = useMemo(() => (task ? getSubtasks(task.id) : []), [task, tasks]);
  const risk = task ? assessTaskRisk(task) : null;
  const progress = task ? rollupProgress(task, subtasks) : null;
  const ownerResolution = task ? resolveTaskOwners(task) : { staff: [], external: [] };
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
    onDelete: (id) => {
      storeDeleteTask(id);
      navigate("/tasks");
    }
  });

  const handleAddSubtask = useCallback(() => {
    if (!task) return;
    openCreateEditor({
      entityType: "task",
      lane: task.lane,
      bureau: task.bureau,
      projectId: task.projectId || (task.entityType === "project" ? task.id : null),
      epicId: task.epicId || (task.entityType === "epic" ? task.id : null),
      parentTaskId: task.id,
      startDate: task.startDate,
      endDate: task.endDate,
      dueDate: task.dueDate || task.endDate
    });
  }, [openCreateEditor, task]);

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell">
        <section className="card page-panel">
          {!task ? (
            <>
              <div className="section-title">Work Item Details</div>
              <h2>Work item not found</h2>
              <p className="note">The requested work item ID is not available in the current register.</p>
              <Link className="primary-btn inline-action" to="/tasks">Back to Tasks</Link>
            </>
          ) : (
            <>
              <div className="section-title">Work Item Details</div>
              <h2>{task.task}</h2>
              {task.description ? <p className="note">{task.description}</p> : null}
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-label">Type</div>
                  <div className="detail-value">{titleCase(task.entityType)}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Bureau</div>
                  <div className="detail-value">{task.bureau}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Project</div>
                  <div className="detail-value">{project?.task || (task.entityType === "project" ? task.task : "Not linked")}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Epic</div>
                  <div className="detail-value">{epic?.task || (task.entityType === "epic" ? task.task : "None")}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Swim lane</div>
                  <div className="detail-value">{task.lane}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Date window</div>
                  <div className="detail-value">
                    {formatDateLabel(task.startDate)} to {formatDateLabel(task.endDate)}
                  </div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Due date</div>
                  <div className="detail-value">{formatDateLabel(task.dueDate)}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">{task.status || "Planned"}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Priority</div>
                  <div className="detail-value">{task.priority || "Medium"}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Risk (computed)</div>
                  <div className="detail-value">
                    {risk.level}
                    {risk.reasons.length ? ` — ${risk.reasons.join("; ")}` : ""}
                  </div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Estimated effort</div>
                  <div className="detail-value">
                    {task.estimatedEffortHours ? `${task.estimatedEffortHours} hours` : "Not estimated"}
                  </div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Owners</div>
                  <div className="detail-value">
                    {ownerResolution.staff.length === 0 && ownerResolution.external.length === 0 ? (
                      "Not assigned"
                    ) : (
                      <div className="owner-row">
                        {ownerResolution.staff.map((person) => (
                          <Link
                            key={person.id}
                            to="/staffing"
                            className="owner-pill"
                            title={person.focus}
                          >
                            <span className="owner-initials">
                              {person.person
                                .split(/\s+/)
                                .map((p) => p[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                            <span>{person.person}</span>
                            <span className="owner-role">{person.role}</span>
                          </Link>
                        ))}
                        {ownerResolution.external.map((name) => (
                          <span key={name} className="owner-pill owner-external">
                            <span>{name}</span>
                            <span className="owner-role">External</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {task.userGroup ? (
                  <div className="detail-block">
                    <div className="detail-label">User group</div>
                    <div className="detail-value">{task.userGroup}</div>
                  </div>
                ) : null}
                {task.appLink ? (
                  <div className="detail-block">
                    <div className="detail-label">App link</div>
                    <div className="detail-value">
                      <a href={task.appLink} target="_blank" rel="noreferrer">{task.appLink}</a>
                    </div>
                  </div>
                ) : null}
                {task.milestone ? (
                  <div className="detail-block">
                    <div className="detail-label">Milestone</div>
                    <div className="detail-value">{task.milestone}</div>
                  </div>
                ) : null}
                {task.confidence ? (
                  <div className="detail-block">
                    <div className="detail-label">Confidence</div>
                    <div className="detail-value">{task.confidence}</div>
                  </div>
                ) : null}
                {task.source ? (
                  <div className="detail-block">
                    <div className="detail-label">Source</div>
                    <div className="detail-value">{task.source}</div>
                  </div>
                ) : null}
              </div>

              {!task.userGroup || !task.appLink || !task.milestone || !task.description ? (
                <p className="note add-details-hint">
                  Some optional fields (description, app link, user group, milestone) are empty.{" "}
                  <button type="button" className="link-btn" onClick={() => openEditEditor(task)}>
                    Add details
                  </button>
                </p>
              ) : null}

              <div className="section-title" style={{ marginTop: 20 }}>Flags</div>
              <h2>Risk & scope flags</h2>
              <TaskFlags task={task} />

              <div className="section-title" style={{ marginTop: 20 }}>Documents</div>
              <h2>Attachments</h2>
              <TaskDocuments task={task} />

              <div className="subtask-section-head">
                <div>
                  <div className="section-title" style={{ marginTop: 20 }}>Subtasks</div>
                  <h2>
                    Child work
                    {progress !== null ? ` — ${progress}% rolled up` : ""}
                  </h2>
                </div>
                <button type="button" className="secondary-btn" onClick={handleAddSubtask}>
                  Add subtask
                </button>
              </div>

              {subtasks.length > 0 ? (
                <>
                  <SubtaskTimeline parent={task} subtasks={subtasks} />
                  <div className="table-wrap">
                    <table className="task-table">
                      <thead>
                        <tr>
                          <th>Subtask</th>
                          <th>Window</th>
                          <th>Status</th>
                          <th>Effort (h)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subtasks.map((sub) => (
                          <tr key={sub.id}>
                            <td>
                              <Link className="table-link" to={`/tasks/${sub.id}`}>{sub.task}</Link>
                            </td>
                            <td>{formatDateLabel(sub.startDate)} to {formatDateLabel(sub.endDate)}</td>
                            <td>{sub.status || "Planned"}</td>
                            <td>{sub.estimatedEffortHours || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="note">No subtasks yet. Use “Add subtask” to break this work item down.</p>
              )}

              <div className="page-actions">
                <button type="button" className="primary-btn" onClick={() => openEditEditor(task)}>
                  Edit Work Item
                </button>
                <Link className="secondary-btn inline-action" to="/tasks">Back to Tasks</Link>
                <Link className="primary-btn inline-action" to="/">Open Roadmap</Link>
              </div>
            </>
          )}
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
