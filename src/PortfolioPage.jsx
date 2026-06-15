import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader";
import {
  assessStaffBurnout,
  assessTaskRisk,
  getRoadmapPortfolio,
  switchRoadmap,
  useActiveRoadmapId,
  useRoadmaps
} from "./taskStore";
import { summarizeMilestones } from "./workItemUtils";
import HelpLink from "./HelpLink";
import backgroundImage from "../design/dos wave background.jpg";

function summarizeRoadmap(entry) {
  const leafIds = new Set(entry.tasks.map((task) => task.parentTaskId).filter(Boolean));
  let high = 0;
  let medium = 0;
  let overdueMilestones = 0;
  entry.tasks.forEach((task) => {
    const level = assessTaskRisk(task).level;
    if (level === "High") high += 1;
    else if (level === "Medium") medium += 1;
    overdueMilestones += summarizeMilestones(task).overdue;
  });
  const burnout = assessStaffBurnout(entry.staffing, entry.tasks);
  const overloaded = burnout.filter((person) => person.level === "Overloaded").length;
  return {
    ...entry,
    taskCount: entry.tasks.length,
    topLevelCount: entry.tasks.filter((task) => !task.parentTaskId).length,
    subtaskCount: entry.tasks.filter((task) => leafIds.has(task.id) || task.parentTaskId).length,
    laneCount: entry.lanes.length,
    staffCount: entry.staffing.length,
    high,
    medium,
    overdueMilestones,
    overloaded
  };
}

export default function PortfolioPage() {
  const roadmaps = useRoadmaps();
  const activeId = useActiveRoadmapId();
  const navigate = useNavigate();

  // Recomputed whenever the registry or active roadmap changes.
  const summaries = useMemo(
    () => getRoadmapPortfolio().map(summarizeRoadmap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roadmaps, activeId]
  );

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, entry) => {
          acc.tasks += entry.taskCount;
          acc.high += entry.high;
          acc.medium += entry.medium;
          acc.overdueMilestones += entry.overdueMilestones;
          acc.overloaded += entry.overloaded;
          return acc;
        },
        { tasks: 0, high: 0, medium: 0, overdueMilestones: 0, overloaded: 0 }
      ),
    [summaries]
  );

  const peopleAcross = useMemo(() => {
    const byName = new Map();
    summaries.forEach((entry) => {
      assessStaffBurnout(entry.staffing, entry.tasks).forEach((person) => {
        const existing = byName.get(person.person) || {
          person: person.person,
          roadmaps: 0,
          activeTasks: 0,
          worstLevel: "Healthy"
        };
        existing.roadmaps += 1;
        existing.activeTasks += person.activeTaskCount;
        const rank = { Healthy: 0, Stretched: 1, Overloaded: 2 };
        if (rank[person.level] > rank[existing.worstLevel]) existing.worstLevel = person.level;
        byName.set(person.person, existing);
      });
    });
    return [...byName.values()].sort((a, b) => b.activeTasks - a.activeTasks);
  }, [summaries]);

  const openRoadmap = (id) => {
    switchRoadmap(id);
    navigate("/");
  };

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell help-shell">
        <section className="card page-panel">
          <div className="page-head-row">
            <div>
              <div className="section-title">Across all roadmaps</div>
              <h2>Portfolio total view</h2>
            </div>
            <HelpLink section="portfolio" />
          </div>
          <p className="note">
            A combined view of every roadmap workspace. Each roadmap keeps its own work items,
            lanes, and staff; this page rolls them up.
          </p>
          <div className="staffing-summary-grid">
            <div className="staff-summary-card">
              <span className="detail-label">Roadmaps</span>
              <strong>{summaries.length}</strong>
            </div>
            <div className="staff-summary-card">
              <span className="detail-label">Work items</span>
              <strong>{totals.tasks}</strong>
            </div>
            <div className="staff-summary-card tone-stretched">
              <span className="detail-label">High / medium risk</span>
              <strong>{totals.high} / {totals.medium}</strong>
            </div>
            <div className="staff-summary-card tone-overloaded">
              <span className="detail-label">Overdue milestones</span>
              <strong>{totals.overdueMilestones}</strong>
            </div>
          </div>
        </section>

        <section className="card page-panel">
          <div className="section-title">Workspaces</div>
          <h2>Roadmaps</h2>
          <div className="health-card-grid">
            {summaries.map((entry) => (
              <article className={`health-card ${entry.id === activeId ? "is-active-roadmap" : ""}`} key={entry.id}>
                <div className="vision-item-header">
                  <strong>{entry.name}</strong>
                  {entry.id === activeId ? <span className="health-pill healthy">Active</span> : null}
                </div>
                <div className="burnout-meta">
                  {entry.topLevelCount} work items · {entry.laneCount} lanes · {entry.staffCount} staff
                </div>
                <div className="portfolio-stat-row">
                  <span className="risk-pill risk-high">{entry.high} high</span>
                  <span className="risk-pill risk-medium">{entry.medium} med</span>
                  {entry.overdueMilestones > 0 ? (
                    <span className="risk-pill risk-medium">{entry.overdueMilestones} overdue</span>
                  ) : null}
                  {entry.overloaded > 0 ? (
                    <span className="risk-pill risk-high">{entry.overloaded} overloaded</span>
                  ) : null}
                </div>
                <div className="page-actions">
                  <button type="button" className="primary-btn" onClick={() => openRoadmap(entry.id)}>
                    {entry.id === activeId ? "Open" : "Switch & open"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {peopleAcross.length > 0 ? (
          <section className="card page-panel">
            <div className="section-title">People across roadmaps</div>
            <h2>Combined staffing</h2>
            <p className="note">
              Staff rosters are per-roadmap; this aggregates anyone who appears in more than one.
            </p>
            <div className="table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Roadmaps</th>
                    <th>Active work items</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {peopleAcross.map((person) => (
                    <tr key={person.person}>
                      <td>{person.person}</td>
                      <td>{person.roadmaps}</td>
                      <td>{person.activeTasks}</td>
                      <td>
                        <span className={`staff-level-pill tone-${person.worstLevel.toLowerCase()}`}>
                          {person.worstLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
