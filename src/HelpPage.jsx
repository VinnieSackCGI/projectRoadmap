import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import backgroundImage from "../design/dos wave background.jpg";

const SECTIONS = [
  {
    id: "overview",
    title: "What this app is",
    body: [
      "Project Roadmap is the team center for planning and tracking work across initiatives, tasks, and staffing. It answers four questions fast: what is planned, in progress, blocked, and done; who is working on what; which dates are at risk; and what documents are attached to each work item.",
      "Use the top navigation to move between the Roadmap, Work Items, Staffing, Executive, and this Guide."
    ]
  },
  {
    id: "roadmap",
    title: "Roadmap (timeline)",
    steps: [
      ["Zoom", "Use Fit / Year / Quarter / Month to control how wide the FY26–FY28 timeline is. Anything but Fit lets the timeline scroll horizontally so bars are easier to read and reschedule. Your choice is remembered."],
      ["Preview vs. pin", "Hover a bar to preview its details on the right. Click a bar to pin those details so the card stays put — then flag it, reschedule it, or open the full record. Press Esc or the ✕ to clear."],
      ["Reschedule", "Drag a bar sideways to move it, or drag its edges to resize. Prefer the keyboard? Pin a bar and use the “◀ 1 week / 1 week ▶” buttons. Every change shows an Undo toast for a few seconds."],
      ["Filters", "Filter the timeline by Bureau, by Status, or show only flagged items. Reset filters clears them all at once."],
      ["Collapse lanes", "Collapse a single lane with the ▾ toggle in its header, or use Collapse all / Expand all. Collapsed lanes show an item count and hide their bars."],
      ["Add work", "Use Add Work Item to create a project, epic, or task."]
    ]
  },
  {
    id: "lanes",
    title: "Managing swim lanes",
    steps: [
      ["Open", "On the Roadmap, click Manage lanes."],
      ["Reorder", "Drag the ⠿ handle (or use the ▲/▼ arrows) to change lane order — the order flows through the whole app."],
      ["Rename", "Edit a lane’s name or caption and click Save. Renaming moves its work items to the new name."],
      ["Add", "Fill in a new lane name and caption, then Add lane."],
      ["Remove", "Click Remove, then type DELETE to confirm. This permanently deletes the lane and every work item assigned to it."]
    ]
  },
  {
    id: "work-items",
    title: "Work Items register",
    steps: [
      ["Sort", "Click any column heading to sort; click again to reverse."],
      ["Filter", "Use the per-column inputs to filter by name, owners, bureau, lane, dates, status, or risk."],
      ["Backup", "Export downloads a JSON backup of the whole roadmap. Import restores one from a file."]
    ]
  },
  {
    id: "details",
    title: "Work Item details",
    steps: [
      ["Open", "Click a work item’s name anywhere, or “Open Details” from the pinned roadmap card."],
      ["Edit", "Use Edit Work Item to change any field. Empty optional fields are hidden with an “Add details” shortcut."],
      ["Milestones", "Add dated milestones or checkpoints and tick them off as they’re met. Open, past-due milestones are flagged Overdue, count toward the item’s risk, and show as a ◆ badge on the roadmap bar."],
      ["Subtasks", "Add subtasks (they inherit the parent’s context). A mini-roadmap shows their timing, and parent progress rolls up from subtask effort estimates."],
      ["Flags", "Raise an At Risk or Scope Unclear flag with a short comment. Resolving a flag requires a resolution note."],
      ["Documents", "Attach files (stored locally for the pilot, up to 3 MB each). Anyone can download or remove them in this pilot build."]
    ]
  },
  {
    id: "staffing",
    title: "Staffing & Executive",
    steps: [
      ["Staffing", "See declared allocation versus live work, with Healthy / Stretched / Overloaded signals per person."],
      ["Assignment hub", "On the Roadmap, the hub maps people to work; staff nodes are colored by burnout. Click a node to focus its links; drag nodes to rearrange."],
      ["Executive", "A one-screen portfolio view — project health, upcoming deadlines, people needing attention, and at-risk projects. Every item links to its detail view."]
    ]
  },
  {
    id: "data",
    title: "About your data",
    body: [
      "When the app is deployed, the roadmap (work items, lanes, staffing, and attachments) is shared so everyone sees the same data; saves use a last-write-wins model. Running locally, everything is stored in your browser only.",
      "Because the pilot uses browser storage, use Export on the Work Items page to keep a backup. Sign-in and role-based permissions (Admin, PM, Basic User, Guest) are planned but not yet enforced — every action is currently open."
    ]
  }
];

export default function HelpPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell help-shell">
        <section className="card page-panel">
          <div className="section-title">Guide</div>
          <h2>How to use Project Roadmap</h2>
          <p className="note">
            A quick tour of every screen and what you can do on it. Jump to a section below.
          </p>
          <nav className="help-toc" aria-label="Guide sections">
            {SECTIONS.map((section) => (
              <a key={section.id} className="help-toc-link" href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="card page-panel help-section">
            <h3>{section.title}</h3>
            {section.body
              ? section.body.map((paragraph, index) => (
                  <p className="note" key={index}>{paragraph}</p>
                ))
              : null}
            {section.steps ? (
              <ol className="help-steps">
                {section.steps.map(([label, text]) => (
                  <li key={label}>
                    <strong>{label}.</strong> {text}
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}

        <section className="card page-panel">
          <div className="page-actions">
            <Link className="primary-btn inline-action" to="/">Open Roadmap</Link>
            <Link className="secondary-btn inline-action" to="/tasks">Open Work Items</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
