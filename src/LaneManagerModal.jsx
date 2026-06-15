import React, { useState } from "react";
import { addLane, moveLane, removeLane, renameLane, reorderLane } from "./taskStore";
import HelpLink from "./HelpLink";

function LaneRow({
  lane,
  index,
  total,
  canDelete,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) {
  const [name, setName] = useState(lane.key);
  const [caption, setCaption] = useState(lane.caption || "");
  const [color, setColor] = useState(lane.color || "#5c667a");
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const dirty =
    name.trim() !== lane.key ||
    caption !== (lane.caption || "") ||
    color !== (lane.color || "#5c667a");

  const save = () => {
    if (!renameLane(lane.key, { key: name, caption, color })) {
      setError("Could not save — name is empty or already in use.");
      return;
    }
    setError("");
  };

  const confirmDelete = () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE to confirm removing this lane.');
      return;
    }
    removeLane(lane.key);
  };

  return (
    <div
      className={`lane-row ${isDragging ? "is-dragging" : ""} ${isOver ? "is-drop-target" : ""}`}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={() => onDrop(index)}
    >
      <div className="lane-row-top">
        <div className="lane-reorder">
          <div
            className="lane-drag-handle"
            draggable
            onDragStart={() => onDragStart(lane.key)}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
            aria-hidden="true"
          >
            ⠿
          </div>
          <button
            type="button"
            className="lane-move-btn"
            onClick={() => moveLane(lane.key, -1)}
            disabled={index === 0}
            aria-label={`Move ${lane.key} up`}
          >
            ▲
          </button>
          <span className="lane-order-index">{index + 1}</span>
          <button
            type="button"
            className="lane-move-btn"
            onClick={() => moveLane(lane.key, 1)}
            disabled={index === total - 1}
            aria-label={`Move ${lane.key} down`}
          >
            ▼
          </button>
        </div>
        <div className="lane-row-fields">
          <label className="lane-field">
            Lane name
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="lane-field">
            Caption
            <input type="text" value={caption} onChange={(event) => setCaption(event.target.value)} />
          </label>
        </div>
        <label className="lane-color-field">
          <span className="lane-color-label">Color</span>
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label={`Color for ${lane.key}`}
          />
        </label>
      </div>

      <div className="lane-row-actions">
        <button type="button" className="primary-btn" onClick={save} disabled={!dirty}>
          Save
        </button>
        {canDelete ? (
          <button type="button" className="danger-btn" onClick={() => { setConfirming((v) => !v); setError(""); }}>
            {confirming ? "Cancel" : "Remove"}
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="lane-delete-confirm">
          <p className="note">
            Removing <strong>{lane.key}</strong> permanently deletes the lane and every
            work item assigned to it. Type <strong>DELETE</strong> to confirm.
          </p>
          <div className="lane-delete-row">
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="DELETE"
              aria-label="Type DELETE to confirm"
            />
            <button type="button" className="danger-btn" onClick={confirmDelete}>
              Delete lane
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

function AddLaneForm() {
  const [key, setKey] = useState("");
  const [caption, setCaption] = useState("");
  const [color, setColor] = useState("#0f766e");
  const [error, setError] = useState("");

  const add = () => {
    if (!addLane({ key, caption, color })) {
      setError("Lane name is empty or already in use.");
      return;
    }
    setKey("");
    setCaption("");
    setError("");
  };

  return (
    <div className="lane-add">
      <div className="lane-row-fields">
        <label className="lane-field">
          New lane name
          <input type="text" value={key} onChange={(event) => setKey(event.target.value)} placeholder="e.g. Data & Reporting" />
        </label>
        <label className="lane-field">
          Caption
          <input type="text" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Short description" />
        </label>
      </div>
      <label className="lane-color-field">
        <span className="lane-color-label">Color</span>
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="New lane color" />
      </label>
      <button type="button" className="primary-btn" onClick={add}>Add lane</button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export default function LaneManagerModal({ open, lanes, onClose }) {
  const [dragKey, setDragKey] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  if (!open) {
    return null;
  }

  const handleDragStart = (key) => {
    setDragKey(key);
    setOverIndex(null);
  };
  const handleDragOver = (event, index) => {
    if (!dragKey) return;
    event.preventDefault();
    setOverIndex(index);
  };
  const handleDrop = (index) => {
    if (dragKey) {
      reorderLane(dragKey, index);
    }
    setDragKey(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragKey(null);
    setOverIndex(null);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-card lane-manager"
        role="dialog"
        aria-modal="true"
        aria-label="Manage swim lanes"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Manage swim lanes</h3>
          <div className="action-group">
            <HelpLink section="lanes" />
            <button className="secondary-btn" type="button" onClick={onClose}>Close</button>
          </div>
        </div>

        <p className="note">
          Drag the handle (or use the arrows) to reorder lanes, rename them or adjust captions then
          Save. Removing a lane deletes the lane and all of its work items, so it asks for a typed
          confirmation.
        </p>

        <div className="lane-list">
          {lanes.map((lane, index) => (
            <LaneRow
              key={lane.key}
              lane={lane}
              index={index}
              total={lanes.length}
              canDelete={lanes.length > 1}
              isDragging={dragKey === lane.key}
              isOver={overIndex === index && dragKey && dragKey !== lane.key}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        <div className="lane-add-section">
          <div className="section-title">Add a lane</div>
          <AddLaneForm />
        </div>
      </div>
    </div>
  );
}
