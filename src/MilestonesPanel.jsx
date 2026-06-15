import React, { useState } from "react";
import { addMilestone, removeMilestone, updateMilestone } from "./taskStore";
import { sortMilestones, todayIsoDate } from "./workItemUtils";

function MilestoneRow({ taskId, milestone, todayIso }) {
  const [title, setTitle] = useState(milestone.title);
  const [date, setDate] = useState(milestone.date || "");

  const overdue = !milestone.done && date && date < todayIso;

  const commit = () => {
    const trimmed = title.trim() || "Milestone";
    if (trimmed !== milestone.title || date !== (milestone.date || "")) {
      updateMilestone(taskId, milestone.id, { title: trimmed, date });
    }
  };

  return (
    <li className={`milestone-item ${milestone.done ? "is-done" : ""} ${overdue ? "is-overdue" : ""}`}>
      <input
        type="checkbox"
        checked={!!milestone.done}
        onChange={(event) => updateMilestone(taskId, milestone.id, { done: event.target.checked })}
        aria-label={`Mark "${milestone.title}" done`}
      />
      <input
        className="milestone-title-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commit}
        placeholder="Milestone"
      />
      <input
        type="date"
        className="milestone-date-input"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        onBlur={commit}
        aria-label="Milestone date"
      />
      {overdue ? <span className="milestone-overdue-chip">Overdue</span> : null}
      <button
        type="button"
        className="secondary-btn milestone-remove"
        onClick={() => removeMilestone(taskId, milestone.id)}
      >
        Remove
      </button>
    </li>
  );
}

export default function MilestonesPanel({ task }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const todayIso = todayIsoDate();
  const list = sortMilestones(task.milestones);

  const submit = () => {
    if (!title.trim()) return;
    addMilestone(task.id, { title, date });
    setTitle("");
    setDate("");
  };

  return (
    <div className="milestones-panel">
      {list.length === 0 ? (
        <p className="note">No milestones yet.</p>
      ) : (
        <ul className="milestone-list">
          {list.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              taskId={task.id}
              milestone={milestone}
              todayIso={todayIso}
            />
          ))}
        </ul>
      )}

      <div className="milestone-add">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New milestone"
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="New milestone date"
        />
        <button type="button" className="primary-btn" onClick={submit} disabled={!title.trim()}>
          Add milestone
        </button>
      </div>
    </div>
  );
}
