import React, { useEffect, useRef, useState } from "react";
import {
  createRoadmap,
  deleteRoadmap,
  renameRoadmap,
  switchRoadmap,
  useActiveRoadmapId,
  useRoadmaps
} from "./taskStore";

function ManageRoadmapsModal({ roadmaps, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-card roadmap-manage"
        role="dialog"
        aria-modal="true"
        aria-label="Manage roadmaps"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Manage roadmaps</h3>
          <button className="secondary-btn" type="button" onClick={onClose}>Close</button>
        </div>
        <p className="note">
          Rename a roadmap, or delete one and everything in it. The active roadmap and your
          selection are shared with the team.
        </p>
        <div className="roadmap-manage-list">
          {roadmaps.map((roadmap) => (
            <ManageRow key={roadmap.id} roadmap={roadmap} canDelete={roadmaps.length > 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ManageRow({ roadmap, canDelete }) {
  const [name, setName] = useState(roadmap.name);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="roadmap-manage-row">
      <input
        className="roadmap-name-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={`Name for ${roadmap.name}`}
      />
      <button
        type="button"
        className="primary-btn"
        onClick={() => renameRoadmap(roadmap.id, name)}
        disabled={!name.trim() || name.trim() === roadmap.name}
      >
        Save
      </button>
      {canDelete ? (
        confirming ? (
          <>
            <button type="button" className="danger-btn" onClick={() => deleteRoadmap(roadmap.id)}>
              Confirm delete
            </button>
            <button type="button" className="secondary-btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="danger-btn" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )
      ) : null}
    </div>
  );
}

export default function RoadmapSwitcher() {
  const roadmaps = useRoadmaps();
  const activeId = useActiveRoadmapId();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [managing, setManaging] = useState(false);
  const rootRef = useRef(null);

  const active = roadmaps.find((roadmap) => roadmap.id === activeId) || roadmaps[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const create = () => {
    const id = createRoadmap(newName);
    switchRoadmap(id);
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="roadmap-switcher" ref={rootRef}>
      <button
        type="button"
        className="roadmap-switcher-btn"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="roadmap-switcher-eyebrow">Roadmap</span>
        <span className="roadmap-switcher-name">{active?.name || "Roadmap"}</span>
        <span className="roadmap-switcher-caret" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="roadmap-menu" role="menu">
          <div className="roadmap-menu-list">
            {roadmaps.map((roadmap) => (
              <button
                key={roadmap.id}
                type="button"
                role="menuitemradio"
                aria-checked={roadmap.id === activeId}
                className={`roadmap-menu-item ${roadmap.id === activeId ? "active" : ""}`}
                onClick={() => {
                  switchRoadmap(roadmap.id);
                  setOpen(false);
                }}
              >
                <span className="roadmap-menu-check" aria-hidden="true">
                  {roadmap.id === activeId ? "✓" : ""}
                </span>
                {roadmap.name}
              </button>
            ))}
          </div>

          <div className="roadmap-menu-footer">
            {creating ? (
              <div className="roadmap-create-row">
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="New roadmap name"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") create();
                    if (event.key === "Escape") setCreating(false);
                  }}
                />
                <button type="button" className="primary-btn" onClick={create} disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            ) : (
              <button type="button" className="roadmap-menu-action" onClick={() => setCreating(true)}>
                + New roadmap
              </button>
            )}
            <button
              type="button"
              className="roadmap-menu-action"
              onClick={() => {
                setManaging(true);
                setOpen(false);
              }}
            >
              Manage roadmaps…
            </button>
          </div>
        </div>
      ) : null}

      {managing ? (
        <ManageRoadmapsModal roadmaps={roadmaps} onClose={() => setManaging(false)} />
      ) : null}
    </div>
  );
}
