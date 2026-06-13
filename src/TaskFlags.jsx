import React, { useState } from "react";
import { FLAG_TYPES } from "./data";
import { addTaskFlag, resolveTaskFlag } from "./taskStore";
import { formatDateLabel } from "./workItemUtils";

function flagToneClass(type) {
  return (type || "").toLowerCase().includes("scope")
    ? "flag-chip flag-scope"
    : "flag-chip flag-risk";
}

export default function TaskFlags({ task, compact = false, canResolve = true }) {
  const flags = Array.isArray(task.flags) ? task.flags : [];
  const open = flags.filter((flag) => flag.status !== "resolved");
  const resolved = flags.filter((flag) => flag.status === "resolved");

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState(FLAG_TYPES[0]);
  const [note, setNote] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [error, setError] = useState("");

  const submitFlag = () => {
    addTaskFlag(task.id, { type, note });
    setNote("");
    setType(FLAG_TYPES[0]);
    setAdding(false);
  };

  const submitResolve = (flagId) => {
    if (!resolutionNote.trim()) {
      setError("A resolution note is required to close a flag.");
      return;
    }
    resolveTaskFlag(task.id, flagId, resolutionNote);
    setResolvingId(null);
    setResolutionNote("");
    setError("");
  };

  return (
    <div className={`task-flags ${compact ? "compact" : ""}`}>
      {open.length === 0 ? (
        <p className="note flags-empty">No active flags.</p>
      ) : (
        <ul className="flag-list">
          {open.map((flag) => (
            <li key={flag.id} className="flag-item">
              <div className="flag-item-head">
                <span className={flagToneClass(flag.type)}>{flag.type}</span>
                <span className="burnout-meta">{formatDateLabel(flag.createdAt?.slice(0, 10))}</span>
              </div>
              {flag.note ? <p className="note flag-note">{flag.note}</p> : null}
              {canResolve && !compact ? (
                resolvingId === flag.id ? (
                  <div className="flag-resolve-form">
                    <textarea
                      rows={2}
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder="Resolution note (required)"
                    />
                    {error ? <p className="error-text">{error}</p> : null}
                    <div className="flag-form-actions">
                      <button type="button" className="secondary-btn" onClick={() => { setResolvingId(null); setError(""); }}>
                        Cancel
                      </button>
                      <button type="button" className="primary-btn" onClick={() => submitResolve(flag.id)}>
                        Resolve
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="secondary-btn flag-resolve-btn"
                    onClick={() => { setResolvingId(flag.id); setResolutionNote(""); setError(""); }}
                  >
                    Resolve flag
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="flag-add-form">
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {FLAG_TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Short comment (optional)"
          />
          <div className="flag-form-actions">
            <button type="button" className="secondary-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="primary-btn" onClick={submitFlag}>Add flag</button>
          </div>
        </div>
      ) : (
        <button type="button" className="secondary-btn flag-add-btn" onClick={() => setAdding(true)}>
          + Flag this item
        </button>
      )}

      {!compact && resolved.length > 0 ? (
        <details className="flag-resolved">
          <summary>{resolved.length} resolved flag{resolved.length === 1 ? "" : "s"}</summary>
          <ul className="flag-list">
            {resolved.map((flag) => (
              <li key={flag.id} className="flag-item is-resolved">
                <div className="flag-item-head">
                  <span className={flagToneClass(flag.type)}>{flag.type}</span>
                  <span className="burnout-meta">Resolved {formatDateLabel(flag.resolvedAt?.slice(0, 10))}</span>
                </div>
                {flag.note ? <p className="note flag-note">{flag.note}</p> : null}
                <p className="note flag-resolution">Resolution: {flag.resolutionNote}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
