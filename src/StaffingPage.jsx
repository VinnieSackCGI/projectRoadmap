import React, { useMemo } from "react";
import AppHeader from "./AppHeader";
import { assessStaffBurnout, useStaffing, useTasks } from "./taskStore";
import backgroundImage from "../design/dos wave background.jpg";

function levelTone(level) {
  const value = (level || "").toLowerCase();
  if (value === "overloaded") return "overloaded";
  if (value === "stretched") return "stretched";
  return "healthy";
}

function clampPercent(value, max = 130) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(max, numeric));
}

export default function StaffingPage() {
  const staffing = useStaffing();
  const tasks = useTasks();
  const burnout = useMemo(() => assessStaffBurnout(staffing, tasks), [staffing, tasks]);
  const burnoutByPerson = useMemo(
    () => Object.fromEntries(burnout.map((entry) => [entry.person, entry])),
    [burnout]
  );
  const staffChartRows = useMemo(
    () =>
      staffing
        .map((person) => {
          const signal = burnoutByPerson[person.person] || {};
          const declaredAllocation = signal.declaredAllocationPercent ?? person.allocationPercent ?? 0;
          const weeklyCapacityHours = signal.weeklyCapacityHours ?? person.weeklyCapacityHours ?? 40;
          return {
            ...person,
            activeTaskCount: signal.activeTaskCount ?? 0,
            totalEstimatedHours: signal.totalEstimatedHours ?? 0,
            declaredAllocation,
            weeklyCapacityHours,
            level: signal.level || "Healthy",
            reasons: signal.reasons || [],
            chartWidth: `${(clampPercent(declaredAllocation) / 130) * 100}%`
          };
        })
        .sort((left, right) => {
          const byAllocation = right.declaredAllocation - left.declaredAllocation;
          if (byAllocation !== 0) return byAllocation;
          const byTaskCount = right.activeTaskCount - left.activeTaskCount;
          if (byTaskCount !== 0) return byTaskCount;
          return left.person.localeCompare(right.person);
        }),
    [staffing, burnoutByPerson]
  );
  const summary = useMemo(() => {
    const totals = staffChartRows.reduce(
      (accumulator, person) => {
        accumulator.totalAllocation += person.declaredAllocation;
        accumulator.totalEstimatedHours += person.totalEstimatedHours;
        accumulator.totalActiveTasks += person.activeTaskCount;
        if (person.level === "Overloaded") accumulator.overloaded += 1;
        else if (person.level === "Stretched") accumulator.stretched += 1;
        else accumulator.healthy += 1;
        return accumulator;
      },
      {
        healthy: 0,
        stretched: 0,
        overloaded: 0,
        totalAllocation: 0,
        totalEstimatedHours: 0,
        totalActiveTasks: 0
      }
    );

    return {
      ...totals,
      averageAllocation: staffChartRows.length
        ? Math.round(totals.totalAllocation / staffChartRows.length)
        : 0
    };
  }, [staffChartRows]);

  return (
    <div className="app-root" style={{ "--roadmap-bg-image": `url(${backgroundImage})` }}>
      <AppHeader />

      <main className="shell">
        <section className="staffing card page-panel">
          <div className="section-title">Overlay</div>
          <h2>Staffing capacity and burnout signals</h2>
          <p className="note">
            Capacity values are seed estimates. The burnout level is derived from declared
            allocation and active task ownership across the roadmap.
          </p>

          <div className="staffing-summary-grid">
            <div className="staff-summary-card">
              <span className="detail-label">Average allocation</span>
              <strong>{summary.averageAllocation}%</strong>
              <span className="burnout-meta">Across {staffChartRows.length} employees</span>
            </div>
            <div className="staff-summary-card">
              <span className="detail-label">Active tasks</span>
              <strong>{summary.totalActiveTasks}</strong>
              <span className="burnout-meta">Assigned across the current roster</span>
            </div>
            <div className="staff-summary-card tone-stretched">
              <span className="detail-label">Stretched</span>
              <strong>{summary.stretched}</strong>
              <span className="burnout-meta">Declared at 85%+ or carrying 5+ active tasks</span>
            </div>
            <div className="staff-summary-card tone-overloaded">
              <span className="detail-label">Overloaded</span>
              <strong>{summary.overloaded}</strong>
              <span className="burnout-meta">Declared at or above 100% allocation</span>
            </div>
          </div>

          <div className="staff-chart-panel">
            <div className="staff-chart-header">
              <div>
                <div className="section-title">Employee visualization</div>
                <h3>Declared allocation versus live work signal</h3>
              </div>
              <div className="staff-chart-legend" aria-label="Burnout legend">
                <span><span className="legend-dot tone-healthy" />Healthy</span>
                <span><span className="legend-dot tone-stretched" />Stretched</span>
                <span><span className="legend-dot tone-overloaded" />Overloaded</span>
              </div>
            </div>

            <div className="staff-chart-scale" aria-hidden="true">
              <span>0%</span>
              <span>85%</span>
              <span>100%</span>
              <span>130%</span>
            </div>

            <div className="staff-chart-grid">
              {staffChartRows.map((person) => {
                const tone = levelTone(person.level);
                return (
                  <article className="staff-chart-row" key={person.id}>
                    <div className="staff-chart-person">
                      <div className="staff-name">{person.person}</div>
                      <div className="staff-role">{person.role}</div>
                    </div>

                    <div className="staff-chart-track" aria-label={`${person.person} allocation ${person.declaredAllocation}%`}>
                      <span className="staff-threshold threshold-stretched" aria-hidden="true" />
                      <span className="staff-threshold threshold-overloaded" aria-hidden="true" />
                      <div className={`staff-chart-bar tone-${tone}`} style={{ width: person.chartWidth }}>
                        <span>{person.declaredAllocation}% allocated</span>
                      </div>
                    </div>

                    <div className="staff-chart-metrics">
                      <span className="staff-metric">{person.activeTaskCount} active</span>
                      <span className="staff-metric">{person.totalEstimatedHours}h est.</span>
                      <span className={`staff-level-pill tone-${tone}`}>{person.level}</span>
                    </div>

                    <div className="staff-chart-focus">
                      <span className="burnout-meta">{person.focus}</span>
                      <span className="burnout-meta">
                        Capacity {person.weeklyCapacityHours}h/week
                        {person.reasons.length ? ` · ${person.reasons.join("; ")}` : ""}
                      </span>
                      {person.recommendation ? (
                        <span className="burnout-meta staff-recommendation">
                          Recommendation: {person.recommendation}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
