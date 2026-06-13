import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "./AppHeader";
import TaskEditorModal from "./TaskEditorModal";
import { bureauStyles, lanes } from "./data";
import {
  assessTaskRisk,
  deleteTask as storeDeleteTask,
  getSubtasks,
  resolveTaskOwners,
  updateTask as storeUpdateTask,
  useStaffing,
  useTasks
} from "./taskStore";
import {
  createEmptyWorkItemDraft,
  formatDateLabel,
  titleCase
} from "./workItemUtils";
import useWorkItemEditor from "./useWorkItemEditor";
import backgroundImage from "../design/dos wave background.jpg";

function createEmptyDraft() {
  return createEmptyWorkItemDraft({
    lane: lanes[0].key,
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

export default function TaskDetailsPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const tasks = useTasks();
  const staffing = useStaffing();
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
    epicOptions,
    isEditorOpen,
    openEditEditor,
    projectOptions,
    saveDraft,
    updateDraft,
    validationError
  } = useWorkItemEditor({
    tasks,
    createEmptyDraft,
    onCreate: storeUpdateTask,
    onUpdate: storeUpdateTask,
    onDelete: (id) => {
      storeDeleteTask(id);
      navigate("/tasks");
    }
  });

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
                <div className="detail-block">
                  <div className="detail-label">User group</div>
                  <div className="detail-value">{task.userGroup || "Not specified"}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">App link</div>
                  <div className="detail-value">
                    {task.appLink ? (
                      <a href={task.appLink} target="_blank" rel="noreferrer">{task.appLink}</a>
                    ) : (
                      "Not specified"
                    )}
                  </div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Milestone</div>
                  <div className="detail-value">{task.milestone || "Not specified"}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Confidence</div>
                  <div className="detail-value">{task.confidence || "Not specified"}</div>
                </div>
                <div className="detail-block">
                  <div className="detail-label">Source</div>
                  <div className="detail-value">{task.source || "Not specified"}</div>
                </div>
              </div>

              {subtasks.length > 0 ? (
                <>
                  <div className="section-title" style={{ marginTop: 20 }}>Subtasks</div>
                  <h2>
                    Child work
                    {progress !== null ? ` — ${progress}% rolled up` : ""}
                  </h2>
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
              ) : null}

              <div className="page-actions">
                <button type="button" className="primary-btn" onClick={openEditEditor}>
                  Edit Task
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
        mode="edit"
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
