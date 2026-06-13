import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { Rnd } from "react-rnd";
import AppHeader from "./AppHeader";
import TaskEditorModal from "./TaskEditorModal";
import {
  bureauStyles,
  lanes,
  quarters,
  TIMELINE_START_DATE,
  TIMELINE_END_DATE,
  years
} from "./data";
import {
  assessTaskRisk,
  createTask as storeCreateTask,
  deleteTask as storeDeleteTask,
  resolveTaskOwners,
  updateTask as storeUpdateTask,
  useStaffing,
  useTasks
} from "./taskStore";
import {
  createEmptyWorkItemDraft,
  formatDateLabel,
  normalizeDateString,
  parseIsoDate,
  toIsoDate,
} from "./workItemUtils";
import useWorkItemEditor from "./useWorkItemEditor";
import backgroundImage from "../dos wave background.jpg";
import "./App.css";

const TASK_ROW_HEIGHT = 112;
const TASK_BAR_HEIGHT = 88;
const TASK_TOP_PADDING = 20;
const TASK_BOTTOM_PADDING = 22;
const HOVER_PANEL_OFFSET = 18;
const HOVER_PANEL_MARGIN = 12;
const BAR_HORIZONTAL_INSET = 6;
const BAR_TOTAL_INSET = 12;
const DEFAULT_TIMELINE_UNIT_WIDTH = 1;
const SNAP_STEP_DAYS = 1;
const MIN_TASK_DURATION = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HUB_VIEWBOX_WIDTH = 1280;
const HUB_VIEWBOX_HEIGHT = 840;
const HUB_CENTER_X = HUB_VIEWBOX_WIDTH / 2;
const HUB_CENTER_Y = HUB_VIEWBOX_HEIGHT / 2;
const HUB_POSITION_STORAGE_KEY = "project-roadmap-hub-positions-v1";

const FALLBACK_TIMELINE_START = new Date(Date.UTC(2025, 9, 1));
const FALLBACK_TIMELINE_END = new Date(Date.UTC(2028, 8, 30));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapToStep(value, step = SNAP_STEP_DAYS) {
  return Math.round(value / step) * step;
}

function daysBetween(startDate, endDate) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

const timelineStartDate = parseIsoDate(TIMELINE_START_DATE) || FALLBACK_TIMELINE_START;
const timelineEndDate = parseIsoDate(TIMELINE_END_DATE) || FALLBACK_TIMELINE_END;
const TIMELINE_LENGTH = Math.max(1, daysBetween(timelineStartDate, timelineEndDate) + 1);

function timelinePositionFromDate(value, fallback = TIMELINE_START_DATE) {
  const normalized = normalizeDateString(value, {
    fallback,
    min: TIMELINE_START_DATE,
    max: TIMELINE_END_DATE
  });
  const date = parseIsoDate(normalized) || timelineStartDate;
  return clamp(daysBetween(timelineStartDate, date), 0, TIMELINE_LENGTH - 1);
}

function dateFromTimelinePosition(position) {
  const clamped = clamp(Math.round(position), 0, TIMELINE_LENGTH - 1);
  const date = new Date(timelineStartDate.getTime() + clamped * MS_PER_DAY);
  return toIsoDate(date);
}

function taskStartFloat(task) {
  return timelinePositionFromDate(task.startDate, TIMELINE_START_DATE);
}

function taskEndFloat(task) {
  const startPos = taskStartFloat(task);
  const endPosInclusive = timelinePositionFromDate(task.endDate, task.startDate || TIMELINE_START_DATE);
  return Math.max(startPos + MIN_TASK_DURATION, endPosInclusive + 1);
}

function todayFloatPosition(date = new Date()) {
  const todayUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  if (todayUtc < timelineStartDate || todayUtc > timelineEndDate) {
    return null;
  }
  return daysBetween(timelineStartDate, todayUtc) + 0.5;
}

function bureauColor(bureau) {
  return bureauStyles[bureau]?.color || "var(--planning)";
}

function isLowConfidence(confidence) {
  return /inferred|conflicting|needs validation|duration inferred/i.test(confidence || "");
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function polarToCartesian(centerX, centerY, radius, angleDegrees) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  };
}

function clampHubPercent(value, min = 6, max = 94) {
  return clamp(value, min, max);
}

function readHubPositionOverrides() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HUB_POSITION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (!value || typeof value !== "object") {
          return [];
        }

        const left = Number(value.left);
        const top = Number(value.top);
        if (!Number.isFinite(left) || !Number.isFinite(top)) {
          return [];
        }

        return [[key, { left: clampHubPercent(left), top: clampHubPercent(top) }]];
      })
    );
  } catch {
    return {};
  }
}

function shortOwners(task) {
  const { staff, external } = resolveTaskOwners(task);
  const total = staff.length + external.length;
  if (total === 0) return "Owner TBD";
  const staffInitials = staff.slice(0, 3).map((person) => initials(person.person));
  const extra = total - Math.min(3, staff.length);
  if (extra <= 0) {
    return staffInitials.join(" ") || external[0] || "Owner TBD";
  }
  const base = staffInitials.length ? staffInitials.join(" ") : external[0] || "";
  return `${base}${base ? " " : ""}+${extra}`;
}

function stackIntervals(items, getStart, getEnd) {
  const rows = [];
  const assignments = [];

  items.forEach((item) => {
    const start = getStart(item);
    const end = getEnd(item);
    let rowIndex = 0;

    while (
      rows[rowIndex] &&
      rows[rowIndex].some((slot) => !(end < slot.start || start > slot.end))
    ) {
      rowIndex += 1;
    }

    rows[rowIndex] = rows[rowIndex] || [];
    rows[rowIndex].push({ start, end });
    assignments.push({ item, rowIndex, start, end });
  });

  return { rows, assignments };
}

function createEmptyDraft() {
  return createEmptyWorkItemDraft({
    lane: lanes[0].key,
    bureau: Object.keys(bureauStyles)[0],
    fallbackDate: toIsoDate(new Date())
  });
}

function LaneTrack({
  lane,
  laneIndex,
  tasks,
  filter,
  activeTaskId,
  todayPosition,
  onTaskHover,
  onTaskMove,
  onTaskClick,
  onTaskDragStop,
  onTaskResizeStop
}) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) {
      return undefined;
    }

    const update = () => {
      setTrackWidth(node.clientWidth);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const laneTasks = useMemo(() => {
    const scoped = tasks.filter((task) => task.lane === lane.key);
    return filter.length === 0
      ? scoped
      : scoped.filter((task) => filter.includes(task.bureau));
  }, [tasks, filter, lane.key]);

  const laneLayout = useMemo(
    () =>
      stackIntervals(
        laneTasks,
        (task) => taskStartFloat(task),
        (task) => taskEndFloat(task)
      ),
    [laneTasks]
  );

  const unitWidth = trackWidth > 0 ? trackWidth / TIMELINE_LENGTH : DEFAULT_TIMELINE_UNIT_WIDTH;
  const laneHeight = Math.max(
    148,
    TASK_TOP_PADDING + laneLayout.rows.length * TASK_ROW_HEIGHT + TASK_BOTTOM_PADDING
  );

  return (
    <>
      <div
        className={`lane-name ${laneIndex % 2 === 1 ? "alt" : ""}`}
        style={{ minHeight: `${laneHeight}px` }}
      >
        <div className="lane-title">{lane.key}</div>
        <div className="lane-caption">{lane.caption}</div>
      </div>

      <div
        className={`lane-track ${laneIndex % 2 === 1 ? "alt" : ""}`}
        ref={trackRef}
        style={{ minHeight: `${laneHeight}px` }}
      >
        {todayPosition !== null && todayPosition >= 0 && todayPosition <= TIMELINE_LENGTH ? (
          <div
            className="today-marker"
            style={{ left: `${(todayPosition / TIMELINE_LENGTH) * 100}%` }}
            aria-hidden="true"
          />
        ) : null}
        {laneLayout.assignments.map(({ item: task, rowIndex, start, end }) => {
          const width = Math.max(20, (end - start) * unitWidth - BAR_TOTAL_INSET);
          const x = start * unitWidth + BAR_HORIZONTAL_INSET;
          const y = TASK_TOP_PADDING + rowIndex * TASK_ROW_HEIGHT;

          return (
            <Rnd
              key={task.id}
              className="task-rnd"
              bounds="parent"
              dragAxis="x"
              enableResizing={{
                left: true,
                right: true,
                top: false,
                bottom: false,
                topLeft: false,
                topRight: false,
                bottomLeft: false,
                bottomRight: false
              }}
              size={{ width, height: TASK_BAR_HEIGHT }}
              position={{ x, y }}
              onDragStop={(_, dragData) => onTaskDragStop(task, dragData.x, unitWidth)}
              onResizeStop={(_, __, ref, ___, position) =>
                onTaskResizeStop(task, position.x, ref.offsetWidth, unitWidth)
              }
            >
              <button
                type="button"
                className={`task-bar ${isLowConfidence(task.confidence) ? "confidence-low" : ""} ${
                  activeTaskId === task.id ? "active" : ""
                } status-${(task.status || "planned").toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  background: `linear-gradient(135deg, ${bureauColor(task.bureau)}, rgba(20, 26, 35, 0.86))`,
                  "--bureau-accent": bureauColor(task.bureau)
                }}
                onMouseEnter={(event) => onTaskHover(task, event, event.currentTarget)}
                onMouseMove={(event) => onTaskMove(task, event)}
                onFocus={(event) => onTaskHover(task, null, event.currentTarget)}
                onClick={(event) => {
                  onTaskHover(task, event, event.currentTarget);
                  onTaskClick(task);
                }}
              >
                <span className="task-bar-accent" aria-hidden="true" />
                <span className="task-title">{task.task}</span>
                <span className="task-meta">
                  <span>{task.bureau}</span>
                  <span>{shortOwners(task)}</span>
                </span>
              </button>
            </Rnd>
          );
        })}
      </div>
    </>
  );
}

function AssignmentHub({
  graph,
  selectedTaskId,
  selectedEmployeeId,
  onMoveNode,
  onSelectEmployee,
  onSelectTask
}) {
  const surfaceRef = useRef(null);
  const dragStateRef = useRef(null);
  const dragSuppressClickRef = useRef(false);
  const selectedProject = useMemo(
    () => graph.projects.find((project) => project.id === selectedTaskId) || null,
    [graph.projects, selectedTaskId]
  );
  const selectedEmployee = useMemo(
    () => graph.employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [graph.employees, selectedEmployeeId]
  );
  const selectedEmployeeIds = useMemo(
    () => new Set(selectedProject?.staffIds || []),
    [selectedProject]
  );
  const selectedProjectIds = useMemo(
    () => new Set(
      selectedEmployee
        ? graph.projects
          .filter((project) => project.staffIds.includes(selectedEmployee.id))
          .map((project) => project.id)
        : []
    ),
    [graph.projects, selectedEmployee]
  );

  const hasProjectSelection = Boolean(selectedProject);
  const hasEmployeeSelection = Boolean(selectedEmployee);

  const handleNodePointerDown = useCallback((event, node) => {
    if (event.button !== 0) {
      return;
    }

    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    const rect = surface.getBoundingClientRect();
    const pointerLeft = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerTop = ((event.clientY - rect.top) / rect.height) * 100;
    dragSuppressClickRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      nodeType: node.type,
      startPointerLeft: pointerLeft,
      startPointerTop: pointerTop,
      originLeft: node.left,
      originTop: node.top,
      moved: false
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleNodePointerMove = useCallback((event) => {
    const surface = surfaceRef.current;
    const dragState = dragStateRef.current;
    if (!surface || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const rect = surface.getBoundingClientRect();
    const pointerLeft = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerTop = ((event.clientY - rect.top) / rect.height) * 100;
    const nextLeft = clampHubPercent(dragState.originLeft + (pointerLeft - dragState.startPointerLeft));
    const nextTop = clampHubPercent(dragState.originTop + (pointerTop - dragState.startPointerTop));
    const movedEnough =
      Math.abs(nextLeft - dragState.originLeft) > 0.35 ||
      Math.abs(nextTop - dragState.originTop) > 0.35;

    if (movedEnough) {
      dragState.moved = true;
      dragSuppressClickRef.current = true;
    }

    onMoveNode(dragState.nodeType, dragState.nodeId, { left: nextLeft, top: nextTop });
  }, [onMoveNode]);

  const handleNodePointerEnd = useCallback((event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
  }, []);

  const handleProjectClick = useCallback((event, projectId, isSelected) => {
    if (dragSuppressClickRef.current) {
      dragSuppressClickRef.current = false;
      event.preventDefault();
      return;
    }

    onSelectTask(isSelected ? null : projectId);
  }, [onSelectTask]);

  const handleEmployeeClick = useCallback((event, employeeId, isSelected) => {
    if (dragSuppressClickRef.current) {
      dragSuppressClickRef.current = false;
      event.preventDefault();
      return;
    }

    onSelectEmployee(isSelected ? null : employeeId);
  }, [onSelectEmployee]);

  if (graph.projects.length === 0) {
    return (
      <div className="assignment-hub-empty">
        <p className="note">
          No currently visible work items have mapped employee assignments yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="assignment-hub-meta">
        <span>{graph.employees.length} employees</span>
        <span>{graph.projects.length} assigned work items</span>
        <span>{graph.connections.length} assignment links</span>
      </div>

      <div className="assignment-hub-surface" ref={surfaceRef}>
        <svg
          className="assignment-hub-lines"
          viewBox={`0 0 ${HUB_VIEWBOX_WIDTH} ${HUB_VIEWBOX_HEIGHT}`}
          aria-hidden="true"
        >
          <circle
            className="assignment-ring outer"
            cx={HUB_CENTER_X}
            cy={HUB_CENTER_Y}
            r="314"
          />
          <circle
            className="assignment-ring inner"
            cx={HUB_CENTER_X}
            cy={HUB_CENTER_Y}
            r="132"
          />

          {graph.connections.map((connection) => {
            const isActive = hasProjectSelection
              ? connection.taskId === selectedProject.id
              : hasEmployeeSelection
                ? connection.staffId === selectedEmployee.id
                : true;
            return (
              <line
                key={`${connection.taskId}-${connection.staffId}`}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                stroke={connection.color}
                strokeWidth={hasProjectSelection || hasEmployeeSelection ? (isActive ? 3.2 : 1.2) : 1.7}
                opacity={hasProjectSelection || hasEmployeeSelection ? (isActive ? 0.88 : 0.1) : 0.24}
              />
            );
          })}
        </svg>

        <div className="assignment-core-label">Staff Core</div>

        {graph.laneLabels.map((lane) => (
          <div
            key={lane.key}
            className="hub-lane-badge"
            style={{ left: `${lane.left}%`, top: `${lane.top}%` }}
          >
            {lane.key}
          </div>
        ))}

        {graph.employees.map((employee) => {
          const isSelected = selectedEmployeeId === employee.id;
          const isDimmed = hasProjectSelection
            ? !selectedEmployeeIds.has(employee.id)
            : hasEmployeeSelection
              ? !isSelected
              : false;
          const isActive = hasProjectSelection
            ? selectedEmployeeIds.has(employee.id)
            : isSelected;
          return (
            <button
              key={employee.id}
              type="button"
              className={`hub-node employee-node ${isDimmed ? "is-dim" : ""} ${isActive ? "is-active" : ""}`}
              style={{ left: `${employee.left}%`, top: `${employee.top}%` }}
              title={employee.person}
              onPointerDown={(event) => handleNodePointerDown(event, { ...employee, type: "employee" })}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerEnd}
              onPointerCancel={handleNodePointerEnd}
              onClick={(event) => handleEmployeeClick(event, employee.id, isSelected)}
              aria-pressed={isSelected}
            >
              <span>{employee.initials}</span>
            </button>
          );
        })}

        {graph.projects.map((project) => {
          const isSelected = selectedTaskId === project.id;
          const isDimmed = hasProjectSelection
            ? !isSelected
            : hasEmployeeSelection
              ? !selectedProjectIds.has(project.id)
              : false;
          return (
            <button
              key={project.id}
              type="button"
              className={`hub-node project-node ${isSelected ? "is-selected" : ""} ${isDimmed ? "is-dim" : ""}`}
              style={{
                left: `${project.left}%`,
                top: `${project.top}%`,
                "--hub-project-color": bureauColor(project.bureau)
              }}
              onPointerDown={(event) => handleNodePointerDown(event, { ...project, type: "project" })}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerEnd}
              onPointerCancel={handleNodePointerEnd}
              onClick={(event) => handleProjectClick(event, project.id, isSelected)}
              aria-pressed={isSelected}
            >
              <span className="project-node-name">{project.task}</span>
              <span className="project-node-meta">{project.bureau} · {project.staffIds.length} assignee{project.staffIds.length === 1 ? "" : "s"}</span>
            </button>
          );
        })}
      </div>

      <div className="assignment-hub-caption-row">
        <p className="note">
          Drag any staff or project node to rearrange the hub. Click a project to highlight
          assignees, or click a staff node to highlight the work they are carrying.
        </p>
        {selectedProject ? (
          <div className="assignment-selection-summary">
            <span className="legend-chip">
              <span className="swatch" style={{ background: bureauColor(selectedProject.bureau) }} />
              {selectedProject.bureau}
            </span>
            <strong>{selectedProject.task}</strong>
            <button type="button" className="secondary-btn" onClick={() => onSelectTask(null)}>
              Clear Highlight
            </button>
          </div>
        ) : null}
        {selectedEmployee ? (
          <div className="assignment-selection-summary">
            <span className="legend-chip">
              <span className="swatch" style={{ background: "var(--accent)" }} />
              Staff focus
            </span>
            <strong>{selectedEmployee.person}</strong>
            <span className="note">
              {selectedProjectIds.size} active assignment{selectedProjectIds.size === 1 ? "" : "s"}
            </span>
            <button type="button" className="secondary-btn" onClick={() => onSelectEmployee(null)}>
              Clear Highlight
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function App() {
  const tasks = useTasks();
  const staffing = useStaffing();
  const navigate = useNavigate();
  const handleTaskClick = useCallback(
    (task) => navigate(`/tasks/${task.id}`),
    [navigate]
  );
  const [filter, setFilter] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [selectedHubTaskId, setSelectedHubTaskId] = useState(null);
  const [selectedHubEmployeeId, setSelectedHubEmployeeId] = useState(null);
  const [hubPositionOverrides, setHubPositionOverrides] = useState(() => readHubPositionOverrides());

  const shellRef = useRef(null);
  const hoverDetailsRef = useRef(null);
  const hoverPointRef = useRef(null);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) || null,
    [tasks, activeTaskId]
  );

  const lowConfidenceCount = useMemo(
    () => tasks.filter((task) => isLowConfidence(task.confidence)).length,
    [tasks]
  );

  const filterOptions = useMemo(
    () => ["All", ...new Set(tasks.map((task) => task.bureau))],
    [tasks]
  );

  const toggleFilter = useCallback((value) => {
    setFilter((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    );
  }, []);

  const clearFilter = useCallback(() => {
    setFilter([]);
  }, []);

  const bureauOptions = useMemo(
    () => [...new Set([...Object.keys(bureauStyles), ...tasks.map((task) => task.bureau)])],
    [tasks]
  );
  const {
    closeEditor,
    deleteDraftTask,
    draft,
    editorMode,
    epicOptions,
    isEditorOpen,
    openCreateEditor,
    openEditEditor,
    projectOptions,
    saveDraft,
    updateDraft,
    validationError
  } = useWorkItemEditor({
    tasks,
    createEmptyDraft,
    onCreate: (normalized) => {
      const created = storeCreateTask(normalized);
      if (created) {
        setActiveTaskId(created.id);
      }
      return created;
    },
    onUpdate: (id, normalized) => {
      const updated = storeUpdateTask(id, normalized);
      setActiveTaskId(id);
      return updated;
    },
    onDelete: (id) => {
      storeDeleteTask(id);
      if (activeTaskId === id) {
        setActiveTaskId(null);
        hoverPointRef.current = null;
      }
    }
  });

  const visibleTasks = useMemo(
    () =>
      filter.length === 0 ? tasks : tasks.filter((task) => filter.includes(task.bureau)),
    [tasks, filter]
  );

  const assignmentHub = useMemo(() => {
    const sortedStaff = [...staffing].sort((left, right) => left.person.localeCompare(right.person));
    const employeeCount = Math.max(sortedStaff.length, 1);
    const employees = sortedStaff.map((person, index) => {
      const angle = -90 + (360 / employeeCount) * index;
      const point = polarToCartesian(HUB_CENTER_X, HUB_CENTER_Y, 118, angle);
      const override = hubPositionOverrides[`employee:${person.id}`];
      const left = override?.left ?? (point.x / HUB_VIEWBOX_WIDTH) * 100;
      const top = override?.top ?? (point.y / HUB_VIEWBOX_HEIGHT) * 100;
      return {
        ...person,
        initials: initials(person.person),
        x: (left / 100) * HUB_VIEWBOX_WIDTH,
        y: (top / 100) * HUB_VIEWBOX_HEIGHT,
        left,
        top
      };
    });

    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
    const laneOrder = new Map(lanes.map((lane, index) => [lane.key, index]));
    const projectSource = visibleTasks
      .map((task) => {
        const { staff } = resolveTaskOwners(task);
        const assignedStaff = staff.filter((person) => employeeById.has(person.id));
        if (assignedStaff.length === 0) {
          return null;
        }
        return {
          ...task,
          staffIds: assignedStaff.map((person) => person.id)
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const laneDelta = (laneOrder.get(left.lane) ?? 0) - (laneOrder.get(right.lane) ?? 0);
        if (laneDelta !== 0) return laneDelta;
        const dateDelta = String(left.startDate || "").localeCompare(String(right.startDate || ""));
        if (dateDelta !== 0) return dateDelta;
        return left.task.localeCompare(right.task);
      });

    const angleStep = 360 / Math.max(lanes.length, 1);
    const projects = [];
    const laneLabels = lanes.map((lane, laneIndex) => {
      const laneProjects = projectSource.filter((task) => task.lane === lane.key);
      const segmentStart = -90 + laneIndex * angleStep;
      const segmentPadding = 8;
      const usableAngle = angleStep - segmentPadding * 2;
      const laneCenterPoint = polarToCartesian(
        HUB_CENTER_X,
        HUB_CENTER_Y,
        386,
        segmentStart + angleStep / 2
      );

      laneProjects.forEach((task, taskIndex) => {
        const fraction = (taskIndex + 0.5) / laneProjects.length;
        const angle = segmentStart + segmentPadding + usableAngle * fraction;
        const radius = 298 + (taskIndex % 2) * 64;
        const point = polarToCartesian(HUB_CENTER_X, HUB_CENTER_Y, radius, angle);
        const override = hubPositionOverrides[`project:${task.id}`];
        const left = override?.left ?? (point.x / HUB_VIEWBOX_WIDTH) * 100;
        const top = override?.top ?? (point.y / HUB_VIEWBOX_HEIGHT) * 100;
        projects.push({
          ...task,
          x: (left / 100) * HUB_VIEWBOX_WIDTH,
          y: (top / 100) * HUB_VIEWBOX_HEIGHT,
          left,
          top
        });
      });

      return {
        key: lane.key,
        left: (laneCenterPoint.x / HUB_VIEWBOX_WIDTH) * 100,
        top: (laneCenterPoint.y / HUB_VIEWBOX_HEIGHT) * 100
      };
    });

    const connections = projects.flatMap((project) =>
      project.staffIds
        .map((staffId) => {
          const employee = employeeById.get(staffId);
          if (!employee) {
            return null;
          }
          return {
            taskId: project.id,
            staffId,
            color: bureauColor(project.bureau),
            from: { x: employee.x, y: employee.y },
            to: { x: project.x, y: project.y }
          };
        })
        .filter(Boolean)
    );

    return { employees, projects, connections, laneLabels };
  }, [hubPositionOverrides, staffing, visibleTasks]);

  const todayPosition = useMemo(() => todayFloatPosition(), []);

  useEffect(() => {
    if (selectedHubTaskId && !assignmentHub.projects.some((project) => project.id === selectedHubTaskId)) {
      setSelectedHubTaskId(null);
    }
  }, [assignmentHub.projects, selectedHubTaskId]);

  useEffect(() => {
    if (selectedHubEmployeeId && !assignmentHub.employees.some((employee) => employee.id === selectedHubEmployeeId)) {
      setSelectedHubEmployeeId(null);
    }
  }, [assignmentHub.employees, selectedHubEmployeeId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(HUB_POSITION_STORAGE_KEY, JSON.stringify(hubPositionOverrides));
  }, [hubPositionOverrides]);

  const handleHubNodeMove = useCallback((nodeType, nodeId, position) => {
    const key = `${nodeType}:${nodeId}`;
    setHubPositionOverrides((current) => {
      const nextPosition = {
        left: clampHubPercent(position.left),
        top: clampHubPercent(position.top)
      };
      const previous = current[key];
      if (previous && previous.left === nextPosition.left && previous.top === nextPosition.top) {
        return current;
      }

      return {
        ...current,
        [key]: nextPosition
      };
    });
  }, []);

  const handleSelectHubTask = useCallback((taskId) => {
    setSelectedHubEmployeeId(null);
    setSelectedHubTaskId(taskId);
  }, []);

  const handleSelectHubEmployee = useCallback((employeeId) => {
    setSelectedHubTaskId(null);
    setSelectedHubEmployeeId(employeeId);
  }, []);

  useEffect(() => {
    if (activeTask && filter.length > 0 && !filter.includes(activeTask.bureau)) {
      setActiveTaskId(null);
      hoverPointRef.current = null;
    }
  }, [activeTask, filter]);

  const positionHoverDetails = useCallback(() => {
    const panel = hoverDetailsRef.current;
    const shell = shellRef.current;

    if (!panel || !shell) {
      return;
    }

    const point = hoverPointRef.current;

    if (!activeTaskId || !point) {
      panel.style.left = "14px";
      panel.style.top = "14px";
      return;
    }

    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    const proposedX = point.x + HOVER_PANEL_OFFSET;
    const proposedY = point.y + HOVER_PANEL_OFFSET;

    const maxX = Math.max(HOVER_PANEL_MARGIN, shell.clientWidth - panelWidth - HOVER_PANEL_MARGIN);
    const maxY = Math.max(HOVER_PANEL_MARGIN, shell.clientHeight - panelHeight - HOVER_PANEL_MARGIN);

    const clampedX = clamp(proposedX, HOVER_PANEL_MARGIN, maxX);
    const clampedY = clamp(proposedY, HOVER_PANEL_MARGIN, maxY);

    panel.style.left = `${clampedX}px`;
    panel.style.top = `${clampedY}px`;
  }, [activeTaskId]);

  useLayoutEffect(() => {
    positionHoverDetails();
  }, [activeTaskId, activeTask, positionHoverDetails]);

  useEffect(() => {
    const handleResize = () => {
      positionHoverDetails();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [positionHoverDetails]);

  const setHoverPointFromEvent = useCallback((event) => {
    if (!event || !shellRef.current) {
      return;
    }
    const shellRect = shellRef.current.getBoundingClientRect();
    hoverPointRef.current = {
      x: event.clientX - shellRect.left,
      y: event.clientY - shellRect.top
    };
  }, []);

  const setHoverPointFromElement = useCallback((element) => {
    if (!element || !shellRef.current) {
      return;
    }
    const shellRect = shellRef.current.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    hoverPointRef.current = {
      x: rect.left - shellRect.left + rect.width / 2,
      y: rect.top - shellRect.top + rect.height / 2
    };
  }, []);

  const handleTaskHover = useCallback(
    (task, event, element) => {
      setActiveTaskId(task.id);
      if (event) {
        setHoverPointFromEvent(event);
      } else {
        setHoverPointFromElement(element);
      }
    },
    [setHoverPointFromElement, setHoverPointFromEvent]
  );

  const handleTaskMove = useCallback(
    (task, event) => {
      if (activeTaskId !== task.id) {
        return;
      }
      setHoverPointFromEvent(event);
      positionHoverDetails();
    },
    [activeTaskId, positionHoverDetails, setHoverPointFromEvent]
  );

  const handleTaskDragStop = useCallback((task, x, unitWidth) => {
    if (!unitWidth) {
      return;
    }

    const currentStart = taskStartFloat(task);
    const currentEnd = taskEndFloat(task);
    const duration = currentEnd - currentStart;

    let newStart = snapToStep((x - BAR_HORIZONTAL_INSET) / unitWidth);
    newStart = clamp(newStart, 0, TIMELINE_LENGTH - duration);
    const newEnd = newStart + duration;

    storeUpdateTask(task.id, {
      startDate: dateFromTimelinePosition(newStart),
      endDate: dateFromTimelinePosition(newEnd - 1)
    });
    setActiveTaskId(task.id);
  }, []);

  const handleTaskResizeStop = useCallback((task, x, width, unitWidth) => {
    if (!unitWidth) {
      return;
    }

    let newStart = snapToStep((x - BAR_HORIZONTAL_INSET) / unitWidth);
    let duration = snapToStep((width + BAR_TOTAL_INSET) / unitWidth);

    duration = Math.max(MIN_TASK_DURATION, duration);
    newStart = clamp(newStart, 0, TIMELINE_LENGTH - MIN_TASK_DURATION);

    let newEnd = newStart + duration;
    if (newEnd > TIMELINE_LENGTH) {
      newEnd = TIMELINE_LENGTH;
      newStart = Math.max(0, newEnd - duration);
    }

    storeUpdateTask(task.id, {
      startDate: dateFromTimelinePosition(newStart),
      endDate: dateFromTimelinePosition(newEnd - 1)
    });
    setActiveTaskId(task.id);
  }, []);

  const timelineStyle = {
    "--roadmap-bg-image": `url(${backgroundImage})`
  };

  return (
    <div className="app-root" style={timelineStyle}>
      <AppHeader />

      <div className="shell">
        <section className="hero">
          <div className="intro card">
            <h1>Regional / Task Force roadmap</h1>
            <p>
              The Regional and WCF portfolio represents a rapidly expanding enterprise
              transformation effort, where the regional task force team is responsible for
              planning, managing, and delivering work across five major solution swim lanes
              while supporting seven bureaus and growing.
            </p>
          </div>

          <div className="stats card">
            <div className="stat">
              <span className="stat-label">Work items</span>
              <span className="stat-value">{tasks.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Swim lanes</span>
              <span className="stat-value">{lanes.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Filtered tasks</span>
              <span className="stat-value">{visibleTasks.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Needs timing validation</span>
              <span className="stat-value">{lowConfidenceCount}</span>
            </div>
          </div>
        </section>

        <section className="toolbar">
          <div className="controls card">
            <div className="legend-bar">
              <button
                type="button"
                className={`legend-chip filter ${filter.length === 0 ? "active" : ""}`}
                onClick={clearFilter}
                aria-pressed={filter.length === 0}
              >
                <span className="swatch swatch-all" />
                All
              </button>
              {filterOptions
                .filter((value) => value !== "All")
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`legend-chip filter ${filter.includes(value) ? "active" : ""}`}
                    onClick={() => toggleFilter(value)}
                    aria-pressed={filter.includes(value)}
                  >
                    <span className="swatch" style={{ background: bureauColor(value) }} />
                    {bureauStyles[value]?.label || value}
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="roadmap card">
          <div className="roadmap-header-row">
            <div>
              <div className="section-title">Timeline</div>
              <h2>Roadmap</h2>
            </div>
            <button type="button" className="primary-btn" onClick={openCreateEditor}>
              Add Work Item
            </button>
          </div>
          <div className="roadmap-layout">
            <div
              className="timeline-shell"
              ref={shellRef}
              onMouseLeave={() => {
                setActiveTaskId(null);
                hoverPointRef.current = null;
              }}
              onScroll={positionHoverDetails}
            >
              <div className="timeline-grid">
                <div className="corner">Solution type</div>
                {years.map((year) => (
                  <div
                    key={year.label}
                    className="year-cell"
                    style={{ gridColumn: `${year.start + 1} / span ${year.span}` }}
                  >
                    {year.label}
                  </div>
                ))}

                <div className="corner" style={{ top: "calc(var(--sticky-top-offset) + 28px)" }}>
                  Quarter
                </div>
                {quarters.map((quarter, index) => (
                  <div
                    key={quarter}
                    className="quarter-cell"
                    style={{
                      top: "calc(var(--sticky-top-offset) + 28px)",
                      gridColumn: `${index + 2}`
                    }}
                  >
                    <span className="quarter-label">{quarter.replace("FY", "FY ")}</span>
                  </div>
                ))}

                {lanes.map((lane, laneIndex) => (
                  <LaneTrack
                    key={lane.key}
                    lane={lane}
                    laneIndex={laneIndex}
                    tasks={tasks}
                    filter={filter}
                    activeTaskId={activeTaskId}
                    todayPosition={todayPosition}
                    onTaskHover={handleTaskHover}
                    onTaskMove={handleTaskMove}
                    onTaskClick={handleTaskClick}
                    onTaskDragStop={handleTaskDragStop}
                    onTaskResizeStop={handleTaskResizeStop}
                  />
                ))}
              </div>

              <div
                ref={hoverDetailsRef}
                className={`hover-details ${activeTask ? "visible" : ""}`}
              >
                {!activeTask ? (
                  <>
                    <div className="section-title">Work Item Details</div>
                    <h2>Hover a roadmap bar</h2>
                    <p className="note">
                      Move your pointer over any task to preview timing, staffing signal,
                      and source. Click Add Work Item to add work, and use Edit Task to update
                      selected entries.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="section-title">Work Item Details</div>
                    <h2>{activeTask.task}</h2>
                    <div className="owner-row">
                      <span className="legend-chip">
                        <span className="swatch" style={{ background: bureauColor(activeTask.bureau) }} />
                        {activeTask.bureau}
                      </span>
                      <span className={`confidence-chip ${isLowConfidence(activeTask.confidence) ? "confidence-low" : ""}`}>
                        {activeTask.confidence}
                      </span>
                    </div>
                    <div className="detail-block">
                      <div className="detail-label">Date window</div>
                      <div className="detail-value">
                        {formatDateLabel(activeTask.startDate)} to {formatDateLabel(activeTask.endDate)}
                      </div>
                    </div>
                    <div className="detail-block">
                      <div className="detail-label">Swim lane</div>
                      <div className="detail-value">{activeTask.lane}</div>
                    </div>
                    <div className="detail-block">
                      <div className="detail-label">Staffing signal</div>
                      <div className="detail-value">
                        {(() => {
                          const owners = resolveTaskOwners(activeTask);
                          const names = [
                            ...owners.staff.map((person) => person.person),
                            ...owners.external
                          ];
                          return names.length ? names.join(", ") : "Not assigned";
                        })()}
                      </div>
                    </div>
                    <div className="detail-block">
                      <div className="detail-label">Status</div>
                      <div className="detail-value">{activeTask.status || "Planned"} · {activeTask.priority || "Medium"} priority</div>
                    </div>
                    {(() => {
                      const risk = assessTaskRisk(activeTask);
                      return (
                        <div className="detail-block">
                          <div className="detail-label">Risk signal</div>
                          <div className="detail-value">
                            {risk.level}
                            {risk.reasons.length ? ` — ${risk.reasons.join("; ")}` : ""}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="detail-block">
                      <div className="detail-label">Source</div>
                      <div className="detail-value">{activeTask.source}</div>
                    </div>
                    <div className="hover-actions">
                      <Link className="primary-btn inline-action" to={`/tasks/${activeTask.id}`}>
                        Open Details
                      </Link>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => openEditEditor(activeTask)}
                      >
                        Edit Task
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="staffing card">
          <div className="section-title">Overlay</div>
          <h2>Employee assignment hub</h2>
          <AssignmentHub
            graph={assignmentHub}
            selectedTaskId={selectedHubTaskId}
                selectedEmployeeId={selectedHubEmployeeId}
                onMoveNode={handleHubNodeMove}
                onSelectEmployee={handleSelectHubEmployee}
                onSelectTask={handleSelectHubTask}
          />
        </section>
      </div>

      <TaskEditorModal
        open={isEditorOpen}
        mode={editorMode}
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
