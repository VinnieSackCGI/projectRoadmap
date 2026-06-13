import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import AppHeader from "./AppHeader";
import { assessStaffBurnout, assessTaskRisk, useStaffing, useTasks } from "./taskStore";
import { formatDateLabel } from "./workItemUtils";
import backgroundImage from "../design/dos wave background.jpg";

function healthClass(level) {
  if (level === "Critical") return "health-pill critical";
  if (level === "At Risk") return "health-pill risk";
  return "health-pill healthy";
}

function summarizeProjects(tasks) {
  const projects = tasks.filter((task) => task.entityType === "project");

  return projects
    .map((project) => {
      const descendants = tasks.filter(
        (task) => task.id !== project.id && task.projectId === project.id
      );
      const riskSignals = [project, ...descendants].map((item) => assessTaskRisk(item));
      const maxRiskScore = riskSignals.reduce((maxScore, risk) => Math.max(maxScore, risk.score), 0);
      const hasBlocked = [project, ...descendants].some(
        (item) => (item.status || "").toLowerCase() === "blocked"
      );
      const hasInProgress = [project, ...descendants].some(
        (item) => (item.status || "").toLowerCase() === "in progress"
      );
      let health = "Healthy";

      if (hasBlocked || maxRiskScore >= 4) {
        health = "Critical";
      } else if (hasInProgress || maxRiskScore >= 2) {
        health = "At Risk";
      }

      return {
        id: project.id,
        task: project.task,
        bureau: project.bureau,
        lane: project.lane,
        dueDate: project.dueDate || project.endDate,
        health,
        epicCount: descendants.filter((item) => item.entityType === "epic").length,
        taskCount: descendants.filter((item) => item.entityType === "task").length,
        reasons: riskSignals.reduce((allReasons, risk) => [...allReasons, ...risk.reasons], [])
      };
    })
    .sort((left, right) => {
      const rank = { Critical: 0, "At Risk": 1, Healthy: 2 };
      if (rank[left.health] !== rank[right.health]) {
        return rank[left.health] - rank[right.health];
      }
      return (left.dueDate || "").localeCompare(right.dueDate || "");
    });
}

export default function ExecutiveDashboardPage() {
  const tasks = useTasks();
  const staffing = useStaffing();

  const initiatives = useMemo(() => summarizeProjects(tasks), [tasks]);
  const burnout = useMemo(() => assessStaffBurnout(staffing, tasks), [staffing, tasks]);
  const upcomingDeadlines = useMemo(
    () => [...initiatives].filter((item) => item.dueDate).slice(0, 6),
    [initiatives]
  );
  const flaggedPeople = useMemo(
    () => burnout.filter((person) => person.level !== "Healthy").slice(0, 6),
    [burnout]
  );
  const criticalProjects = useMemo(
    () => initiatives.filter((item) => item.health !== "Healthy").slice(0, 6),
    [initiatives]
  );

  const metrics = useMemo(() => {
    const healthy = initiatives.filter((item) => item.health === "Healthy").length;
    const atRisk = initiatives.filter((item) => item.health === "At Risk").length;
    const critical = initiatives.filter((item) => item.health === "Critical").length;
    const overloaded = burnout.filter((person) => person.level === "Overloaded").length;

    return [
      { label: "Healthy projects", value: healthy },
      { label: "At risk projects", value: atRisk },
      { label: "Critical projects", value: critical },
      { label: "Overloaded staff", value: overloaded }
    ];
  }, [burnout, initiatives]);

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell executive-shell">
        <section className="hero executive-hero">
          <article className="card intro">
            <div className="eyebrow">Live Executive View</div>
            <h1>Portfolio Health In One Screen</h1>
            <p>
              This view packages roadmap status, deadline pressure, and workforce strain into a
              screen-shareable dashboard backed by the same task and staffing store as the working views.
            </p>
            <div className="metric-row executive-action-row">
              <Link className="primary-btn inline-action" to="/">Open Roadmap</Link>
              <Link className="filter-button" to="/tasks">Open Task Register</Link>
              <Link className="filter-button" to="/staffing">Open Staffing View</Link>
            </div>
          </article>

          <aside className="card stats vision-stats">
            {metrics.map((metric) => (
              <div className="stat" key={metric.label}>
                <div className="stat-label">{metric.label}</div>
                <span className="stat-value">{metric.value}</span>
              </div>
            ))}
          </aside>
        </section>

        <section className="dashboard-grid">
          <section className="card page-panel dashboard-panel">
            <div className="section-title">Portfolio Health</div>
            <h2>Project Status</h2>
            {initiatives.length ? (
              <div className="health-card-grid">
                {initiatives.map((initiative) => (
                <article className="health-card" key={initiative.id}>
                  <div className="vision-item-header">
                    <strong>{initiative.task}</strong>
                    <span className={healthClass(initiative.health)}>{initiative.health}</span>
                  </div>
                  <div className="detail-value">{initiative.bureau} · {initiative.lane}</div>
                  <div className="burnout-meta">{initiative.epicCount} epics · {initiative.taskCount} task items</div>
                  <div className="burnout-meta">Due {formatDateLabel(initiative.dueDate)}</div>
                  <p className="note">
                    {initiative.reasons.length ? initiative.reasons[0] : "No material signal detected."}
                  </p>
                </article>
                ))}
              </div>
            ) : (
              <p className="note">No explicit project items are available yet in the roadmap data.</p>
            )}
          </section>

          <section className="card page-panel dashboard-panel">
            <div className="section-title">Upcoming Deadlines</div>
            <h2>Next Delivery Windows</h2>
            <div className="dashboard-list">
              {upcomingDeadlines.map((item) => (
                <div className="dashboard-list-item" key={item.id}>
                  <div>
                    <strong>{item.task}</strong>
                    <div className="detail-value">{item.bureau} · {item.lane}</div>
                  </div>
                  <div className="dashboard-list-meta">{formatDateLabel(item.dueDate)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card page-panel dashboard-panel">
            <div className="section-title">Resource Heat</div>
            <h2>People Needing Attention</h2>
            <div className="dashboard-list">
              {flaggedPeople.length ? flaggedPeople.map((person) => (
                <div className="dashboard-list-item" key={person.person}>
                  <div>
                    <strong>{person.person}</strong>
                    <div className="detail-value">{person.level}</div>
                  </div>
                  <div className="dashboard-list-meta">{person.declaredAllocationPercent}%</div>
                </div>
              )) : (
                <p className="note">No stretched or overloaded staffing signals are active.</p>
              )}
            </div>
          </section>

          <section className="card page-panel dashboard-panel">
            <div className="section-title">Watch List</div>
            <h2>Projects At Risk</h2>
            <div className="dashboard-list">
              {criticalProjects.length ? criticalProjects.map((item) => (
                <div className="dashboard-list-item" key={item.id}>
                  <div>
                    <strong>{item.task}</strong>
                    <div className="detail-value">{item.health}</div>
                  </div>
                  <div className="dashboard-list-meta">{item.bureau}</div>
                </div>
              )) : (
                <p className="note">No current yellow or red initiatives are detected.</p>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}