import React from "react";
import {
  TASK_PRIORITIES,
  TASK_RISK_LEVELS,
  TASK_STATUSES
} from "./data";

export default function TaskEditorModal({
  open,
  mode,
  draft,
  lanes,
  bureauOptions,
  staffing = [],
  onChange,
  onCancel,
  onSave,
  onDelete,
  validationError
}) {
  const ownerIds = Array.isArray(draft.ownerIds) ? draft.ownerIds : [];
  const toggleOwner = (id) => {
    const next = ownerIds.includes(id)
      ? ownerIds.filter((existing) => existing !== id)
      : [...ownerIds, id];
    onChange("ownerIds", next);
  };
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "Add work item" : "Edit work item"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{mode === "create" ? "Add Work Item" : "Edit Work Item"}</h3>
          <button className="secondary-btn" type="button" onClick={onCancel}>Close</button>
        </div>

        <div className="modal-grid">
          <label className="modal-grid-full">
            Item name
            <input
              type="text"
              value={draft.task}
              onChange={(event) => onChange("task", event.target.value)}
              placeholder="Work item title"
            />
          </label>

          <label>
            Swim lane
            <select value={draft.lane} onChange={(event) => onChange("lane", event.target.value)}>
              {lanes.map((lane) => (
                <option key={lane.key} value={lane.key}>{lane.key}</option>
              ))}
            </select>
          </label>

          <label>
            Bureau
            <select value={draft.bureau} onChange={(event) => onChange("bureau", event.target.value)}>
              {bureauOptions.map((bureau) => (
                <option key={bureau} value={bureau}>{bureau}</option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={draft.status || "Planned"}
              onChange={(event) => onChange("status", event.target.value)}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={draft.priority || "Medium"}
              onChange={(event) => onChange("priority", event.target.value)}
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            Risk level
            <select
              value={draft.riskLevel || "Low"}
              onChange={(event) => onChange("riskLevel", event.target.value)}
            >
              {TASK_RISK_LEVELS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            Start date
            <input
              type="date"
              value={draft.startDate || ""}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
          </label>

          <label>
            End date
            <input
              type="date"
              min={draft.startDate || undefined}
              value={draft.endDate || ""}
              onChange={(event) => onChange("endDate", event.target.value)}
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              min={draft.startDate || undefined}
              value={draft.dueDate || ""}
              onChange={(event) => onChange("dueDate", event.target.value)}
            />
          </label>

          <label>
            Estimated effort (hours)
            <input
              type="number"
              min="0"
              value={draft.estimatedEffortHours ?? 0}
              onChange={(event) =>
                onChange("estimatedEffortHours", Number(event.target.value) || 0)
              }
            />
          </label>

          <div className="modal-grid-full owner-picker">
            <div className="owner-picker-label">Owners (staff)</div>
            <div className="owner-picker-grid">
              {staffing.map((person) => {
                const checked = ownerIds.includes(person.id);
                return (
                  <label key={person.id} className={`owner-check ${checked ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOwner(person.id)}
                    />
                    <span className="owner-check-name">{person.person}</span>
                    <span className="owner-check-role">{person.role}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="modal-grid-full">
            External owners (non-staff)
            <input
              type="text"
              value={draft.externalOwners || ""}
              onChange={(event) => onChange("externalOwners", event.target.value)}
              placeholder="Semicolon-separated names — e.g. Leadership, TBD"
            />
          </label>

          <label>
            User group
            <input
              type="text"
              value={draft.userGroup || ""}
              onChange={(event) => onChange("userGroup", event.target.value)}
              placeholder="Stakeholder or user group"
            />
          </label>

          <label>
            App link
            <input
              type="url"
              value={draft.appLink || ""}
              onChange={(event) => onChange("appLink", event.target.value)}
              placeholder="https://"
            />
          </label>

          <label>
            Confidence
            <input
              type="text"
              value={draft.confidence}
              onChange={(event) => onChange("confidence", event.target.value)}
              placeholder="Confidence statement"
            />
          </label>

          <label>
            Source
            <input
              type="text"
              value={draft.source}
              onChange={(event) => onChange("source", event.target.value)}
              placeholder="Source text"
            />
          </label>

          <label className="modal-grid-full">
            Description
            <textarea
              rows={4}
              value={draft.description || ""}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="What this work item covers, scope notes, and key context."
            />
          </label>
        </div>

        {validationError ? <p className="error-text">{validationError}</p> : null}

        <div className="modal-actions">
          {mode === "edit" ? (
            <button className="danger-btn" type="button" onClick={onDelete}>Delete Item</button>
          ) : <span />}
          <div className="action-group">
            <button className="secondary-btn" type="button" onClick={onCancel}>Cancel</button>
            <button className="primary-btn" type="button" onClick={onSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
