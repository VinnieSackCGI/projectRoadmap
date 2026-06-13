export const quarters = [
  "FY26 Q1", "FY26 Q2", "FY26 Q3", "FY26 Q4",
  "FY27 Q1", "FY27 Q2", "FY27 Q3", "FY27 Q4",
  "FY28 Q1", "FY28 Q2", "FY28 Q3", "FY28 Q4"
];

export const years = [
  { label: "FY26", start: 1, span: 4 },
  { label: "FY27", start: 5, span: 4 },
  { label: "FY28", start: 9, span: 4 }
];

export const TIMELINE_START_DATE = "2025-10-01";
export const TIMELINE_END_DATE = "2028-09-30";

export const lanes = [
  {
    key: "Domestic Budget and Execution",
    caption: "Domestic planning, execution tracking, and bureau rollout."
  },
  {
    key: "Overseas Dashboard and Budget Formulation",
    caption: "Post-level budget formulation and regional dashboard work."
  },
  {
    key: "Country or Bureau Specific Solution",
    caption: "One-off bureau, country, and urgent-response solution work."
  },
  {
    key: "Appropriations and Spend Plan",
    caption: "Spend plan phases, reconciliation, and scenario planning."
  },
  {
    key: "Regional Platform and Shared Services",
    caption: "Shared apps, portal, OM support, DT&A, and platform foundation."
  }
];

export const TASK_STATUSES = ["Planned", "In Progress", "Blocked", "Done", "Cancelled"];
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const TASK_RISK_LEVELS = ["Low", "Medium", "High"];
export const TASK_ENTITY_TYPES = ["project", "epic", "task"];

export const TASK_DEFAULTS = {
  entityType: "task",
  description: "",
  status: "Planned",
  priority: "Medium",
  riskLevel: "Low",
  dueDate: "",
  estimatedEffortHours: 0,
  parentTaskId: null,
  projectId: null,
  epicId: null,
  appLink: "",
  userGroup: "",
  milestones: [],
  documents: [],
  flags: [],
  startDate: TIMELINE_START_DATE,
  endDate: TIMELINE_START_DATE,
  ownerIds: [],
  externalOwners: "",
  createdAt: null,
  updatedAt: null
};

export function staffIdFromName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const bureauStyles = {
  "WHA": { color: "var(--wha)", label: "WHA" },
  "NEA": { color: "var(--nea)", label: "NEA" },
  "SCA": { color: "var(--sca)", label: "SCA" },
  "CARE": { color: "var(--care)", label: "CARE" },
  "WCF": { color: "var(--wcf)", label: "WCF" },
  "WCF or CARE": { color: "var(--wcf)", label: "WCF or CARE" },
  "Regional All": { color: "var(--regional)", label: "Regional All" },
  "IRAQ": { color: "var(--iraq)", label: "IRAQ" },
  "Planning": { color: "var(--planning)", label: "Planning" }
};

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function quarterToIsoDate(quarterLabel, isEnd = false) {
  const match = /^FY(\d{2})\s*Q([1-4])$/i.exec((quarterLabel || "").trim());
  if (!match) {
    return null;
  }

  const fiscalYear = 2000 + Number(match[1]);
  const quarter = Number(match[2]);

  const startYear = quarter === 1 ? fiscalYear - 1 : fiscalYear;
  const startMonth = quarter === 1 ? 9 : quarter === 2 ? 0 : quarter === 3 ? 3 : 6;

  const start = new Date(Date.UTC(startYear, startMonth, 1));
  const end = new Date(Date.UTC(startYear, startMonth + 3, 0));
  return toIsoDate(isEnd ? end : start);
}

export const initialTasks = [
  {
    task: "Domestic Module (WHA)",
    lane: "Domestic Budget and Execution",
    bureau: "WHA",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Begin WHA domestic delivery",
    owners: "Jason Jensen; Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Confirmed quarter from plan",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Domestic Module (NEA)",
    lane: "Domestic Budget and Execution",
    bureau: "NEA",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Leverage WHA pattern for NEA",
    owners: "Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Confirmed quarter from plan",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Domestic Module (SCA)",
    lane: "Domestic Budget and Execution",
    bureau: "SCA",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Leverage WHA pattern for SCA",
    owners: "Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Confirmed quarter from plan",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Task Force Dashboard (NEA)",
    lane: "Country or Bureau Specific Solution",
    bureau: "NEA",
    start: "FY26 Q2",
    end: "FY26 Q3",
    milestone: "Emergency and task-force visibility support",
    owners: "Matt Ford",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Evacuation Spending Tracker and Dashboard",
    lane: "Country or Bureau Specific Solution",
    bureau: "NEA",
    start: "FY26 Q2",
    end: "FY26 Q3",
    milestone: "Deliver as soon as possible for crisis needs",
    owners: "Matt Ford; Osmar Rosales",
    confidence: "Confirmed urgency; quarter inferred",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Program Efficiency Review",
    lane: "Country or Bureau Specific Solution",
    bureau: "CARE",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "CARE program efficiency delivery target",
    owners: "Fatima Barry; Andrew Hill; Russell Sherrod; Benjamin Eidelkind; Scott Florence; Isaiah Wood",
    confidence: "Confirmed quarter from plan",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Disaster Readiness Solution - Evacuation Playbook",
    lane: "Country or Bureau Specific Solution",
    bureau: "Regional All",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Playbook available before broader disaster module",
    owners: "Fatima Barry; Andrew Hill; Russell Sherrod",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "IRAQ (NEA)",
    lane: "Country or Bureau Specific Solution",
    bureau: "IRAQ",
    start: "FY26 Q4",
    end: "FY27 Q2",
    milestone: "Iraq roadmap in Q3 with initial capabilities by mid Q4",
    owners: "Matt Ford; Scott Florence; Osmar Rosales; Russell Sherrod; Eric Thaxton; Isaiah Wood",
    confidence: "Confirmed milestone; duration inferred",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Syria (NEA)",
    lane: "Country or Bureau Specific Solution",
    bureau: "NEA",
    start: "FY27 Q1",
    end: "FY27 Q2",
    milestone: "Syria-specific workstream begins after Iraq ramp",
    owners: "Owner not explicit in staffing sheet",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Ukraine",
    lane: "Country or Bureau Specific Solution",
    bureau: "Planning",
    start: "FY27 Q3",
    end: "FY27 Q4",
    milestone: "Procurement target in FY27",
    owners: "Leadership and planning oversight",
    confidence: "Confirmed year from plan; quarter inferred",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "EAP",
    lane: "Country or Bureau Specific Solution",
    bureau: "Planning",
    start: "FY27 Q4",
    end: "FY28 Q1",
    milestone: "Target procurement shows conflicting timing across sources",
    owners: "Leadership and planning oversight",
    confidence: "Conflicting sources needs validation",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "AF",
    lane: "Country or Bureau Specific Solution",
    bureau: "Planning",
    start: "FY28 Q2",
    end: "FY28 Q3",
    milestone: "Future regional expansion milestone",
    owners: "Leadership and planning oversight",
    confidence: "Plan says FY27 target; roadmap shows later",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "EUR",
    lane: "Country or Bureau Specific Solution",
    bureau: "Planning",
    start: "FY28 Q3",
    end: "FY28 Q4",
    milestone: "Future regional expansion milestone",
    owners: "Leadership and planning oversight",
    confidence: "Confirmed as later horizon; quarter inferred",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Phase 1 - Spend Plan Create",
    lane: "Appropriations and Spend Plan",
    bureau: "WCF or CARE",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Phase 1 spend plan creation complete",
    owners: "Staff not explicit in sheet",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Phase 2.1 - Reconciliation and Expand Data Sources",
    lane: "Appropriations and Spend Plan",
    bureau: "WCF or CARE",
    start: "FY26 Q4",
    end: "FY27 Q1",
    milestone: "Expanded data sources and reconciliation complete",
    owners: "Matt Ford; Ziv Agasi",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Phase 2.2 - Forecast Trends and Scenario Planning",
    lane: "Appropriations and Spend Plan",
    bureau: "WCF or CARE",
    start: "FY27 Q1",
    end: "FY27 Q3",
    milestone: "Forecast and scenario planning capability complete",
    owners: "Matt Ford; Ziv Agasi",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Overseas Module (WHA)",
    lane: "Overseas Dashboard and Budget Formulation",
    bureau: "WHA",
    start: "FY27 Q1",
    end: "FY27 Q2",
    milestone: "Overseas module extends domestic pattern to posts",
    owners: "Jason Jensen; Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Overseas Module (SCA)",
    lane: "Overseas Dashboard and Budget Formulation",
    bureau: "SCA",
    start: "FY27 Q1",
    end: "FY27 Q2",
    milestone: "Overseas module extends domestic pattern to posts",
    owners: "Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Overseas Module (NEA)",
    lane: "Overseas Dashboard and Budget Formulation",
    bureau: "NEA",
    start: "FY27 Q1",
    end: "FY27 Q2",
    milestone: "Overseas module extends domestic pattern to posts",
    owners: "Matt Ford; Scott Florence; Isaiah Wood",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Regional Overseas Dashboard",
    lane: "Overseas Dashboard and Budget Formulation",
    bureau: "Regional All",
    start: "FY27 Q2",
    end: "FY27 Q3",
    milestone: "Regional dashboard aggregates posts worldwide",
    owners: "Ziv Agasi",
    confidence: "Inferred from roadmap layout",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Representation and Gift App",
    lane: "Regional Platform and Shared Services",
    bureau: "Regional All",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Domestic and overseas capture capability available",
    owners: "Owner not explicit in staffing sheet",
    confidence: "Inferred from roadmap layout",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Information System Desktop and Services (DT&A)",
    lane: "Regional Platform and Shared Services",
    bureau: "Regional All",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Shared platform and environment support in place",
    owners: "Matt Ford; Ziv Agasi",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Apptio - Replacement",
    lane: "Regional Platform and Shared Services",
    bureau: "WCF",
    start: "FY26 Q3",
    end: "FY26 Q4",
    milestone: "Replacement decision and rollout",
    owners: "Matt Ford",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Freight Forward (A)",
    lane: "Regional Platform and Shared Services",
    bureau: "WCF",
    start: "FY27 Q1",
    end: "FY27 Q2",
    milestone: "Freight forward work package delivered",
    owners: "Matt Ford",
    confidence: "Inferred from roadmap layout",
    source: "Regionals Outlook"
  },
  {
    task: "Portal",
    lane: "Regional Platform and Shared Services",
    bureau: "Regional All",
    start: "FY27 Q2",
    end: "FY27 Q4",
    milestone: "Regional portal becomes hub for tools and documentation",
    owners: "Owner not explicit in staffing sheet",
    confidence: "Inferred from roadmap layout",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "OM and Support",
    lane: "Regional Platform and Shared Services",
    bureau: "CARE",
    start: "FY27 Q1",
    end: "FY27 Q4",
    milestone: "Ongoing operational support maintained through FY27",
    owners: "Scott Florence; Isaiah Wood; Benjamin Eidelkind",
    confidence: "Confirmed ongoing support; duration inferred",
    source: "Regional Plan + Regionals Outlook"
  },
  {
    task: "Disaster Readiness Solution - Application and Dashboard",
    lane: "Regional Platform and Shared Services",
    bureau: "Regional All",
    start: "FY28 Q1",
    end: "FY28 Q2",
    milestone: "Broader disaster solution available with leadership reporting",
    owners: "Fatima Barry; Andrew Hill; Russell Sherrod",
    confidence: "Inferred from roadmap layout",
    source: "Regional Plan + Regionals Outlook"
  }
].map((task, index) => {
  const startDate = task.startDate || quarterToIsoDate(task.start, false) || TIMELINE_START_DATE;
  const endDate = task.endDate || quarterToIsoDate(task.end || task.start, true) || startDate;

  return {
    id: `task-${index + 1}`,
    ...task,
    startDate,
    endDate,
    dueDate: task.dueDate || endDate
  };
});

// Capacity fields (`weeklyCapacityHours`, `allocationPercent`) feed the burnout
// heuristic in taskStore.assessStaffBurnout. Numbers are seed estimates; refine
// in the Staffing page (or via the agent) before relying on them.
export const initialStaffing = [
  {
    person: "Nupur Moondra",
    role: "Director",
    focus: "Regional oversight and engagement; leadership liaison; planning and roadmap oversight",
    recommendation: "Show as leadership oversight note",
    weeklyCapacityHours: 40,
    allocationPercent: 60
  },
  {
    person: "Vinson Sack",
    role: "Technical Lead",
    focus: "Technical Oversight; Domestic Module (NEA/SCA); WHA support; Iraq; Middle East evacuation work; WCF freight forward; Apptio replacement",
    recommendation: "Show as leadership oversight note",
    weeklyCapacityHours: 40,
    allocationPercent: 95
  },
  {
    person: "Matt Ford",
    role: "Technical",
    focus: "Domestic Module (NEA/SCA); WHA support; Iraq; Middle East evacuation work; WCF freight forward; Apptio replacement",
    recommendation: "Use initials on bars plus count badge for heavily loaded periods",
    weeklyCapacityHours: 40,
    allocationPercent: 110
  },
  {
    person: "Jason Jensen",
    role: "Technical",
    focus: "Domestic Module (WHA); Overseas Module (WHA)",
    recommendation: "Use initials on WHA bars",
    weeklyCapacityHours: 40,
    allocationPercent: 70
  },
  {
    person: "Ziv Agasi",
    role: "Technical",
    focus: "Regional data support; dashboard and data work; spend plan analytics",
    recommendation: "Use initials on data-heavy bars",
    weeklyCapacityHours: 40,
    allocationPercent: 80
  },
  {
    person: "Scott Florence",
    role: "Functional",
    focus: "CARE; IRAQ; NEA/SCA; WHA",
    recommendation: "Use initials on functional bars",
    weeklyCapacityHours: 40,
    allocationPercent: 90
  },
  {
    person: "Isaiah Wood",
    role: "Mix",
    focus: "CARE; IRAQ; NEA/SCA; WHA",
    recommendation: "Use initials on cross-functional bars",
    weeklyCapacityHours: 40,
    allocationPercent: 90
  },
  {
    person: "Fatima Barry",
    role: "Functional",
    focus: "CARE program efficiency; disaster plan",
    recommendation: "Use initials on CARE and disaster bars",
    weeklyCapacityHours: 40,
    allocationPercent: 70
  },
  {
    person: "Andrew Hill",
    role: "Functional",
    focus: "CARE program efficiency; disaster plan",
    recommendation: "Use initials on CARE and disaster bars",
    weeklyCapacityHours: 40,
    allocationPercent: 65
  },
  {
    person: "Russell Sherrod",
    role: "Functional",
    focus: "CARE program efficiency; disaster plan; IRAQ",
    recommendation: "Use initials on CARE, disaster, and Iraq bars",
    weeklyCapacityHours: 40,
    allocationPercent: 85
  },
  {
    person: "Benjamin Eidelkind",
    role: "Functional",
    focus: "CARE 50 percent; ECA 50 percent",
    recommendation: "Show as split allocation note not full bar label",
    weeklyCapacityHours: 40,
    allocationPercent: 50
  },
  {
    person: "Osmar Rosales",
    role: "Functional",
    focus: "IRAQ; Middle East app",
    recommendation: "Use initials on Iraq and evacuation bars",
    weeklyCapacityHours: 40,
    allocationPercent: 70
  },
  {
    person: "Eric Thaxton",
    role: "Functional",
    focus: "IRAQ; CA 50 percent",
    recommendation: "Show as Iraq support and split allocation note",
    weeklyCapacityHours: 40,
    allocationPercent: 50
  }
].map((person) => ({ id: staffIdFromName(person.person), ...person }));
