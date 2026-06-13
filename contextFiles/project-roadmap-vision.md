# Project Roadmap - Product Vision and Build Plan

Last updated: 2026-04-19
Proposed app name: Project Roadmap

## 1. Product North Star

Project Roadmap is the team center for planning and execution across initiatives, tasks, and staffing.
Pilot intent for leadership validation:
- Improve planning confidence for PMs and teams
- Improve completion reliability for committed work

It should answer these questions fast:
- What is planned, in progress, blocked, and done?
- Who is working on what right now?
- Which milestones and due dates are at risk?
- What documents and links are attached to each task?

## 2. Current Implementation Snapshot (Verified)

## 2.1 Current stack and runtime
- Frontend: React 18 + Vite
- UI interaction: react-rnd for drag and resize task bars
- Persistence: browser localStorage only
- Data source: static seed data in app files
- Deployment state: local build works; no cloud environment configured yet

## 2.2 What is already built
- A single-page timeline experience with swim lanes
- Five swim lanes for the current portfolio model
- Fiscal-year quarter timeline (FY26 to FY28)
- Drag and resize interactions for timeline bars (quarter-aligned)
- Add Task modal
- Edit Task modal
- Delete Task support
- Hover detail card that follows cursor and shows selected task context
- Bureau filtering and color legend controls
- Staffing overlay section with people, roles, focus, recommendation
- Styling system and responsive layout for desktop/mobile
- Data normalization guardrails for malformed task quarter values

## 2.3 Current task data fields in use
- id
- task
- lane
- bureau
- start
- end
- milestone
- owners
- confidence
- source

## 2.4 Current limitations
- No authentication or team identity model
- No backend API
- No shared database
- No real-time collaboration
- No audit history of edits
- No dedicated task details page
- No due date field
- No structured major milestone list per task
- No app URL field per task
- No user-group field per task
- No task-level document repository
- Staffing section is list cards, not hierarchy graph

## 3. Target Vision (What we need to build)

## 3.1 Product structure (multi-page)
- Roadmap page: high-level timeline and lane planning
- Tasks page: searchable and filterable task register view
- Task Details page: full record of one task
- Staffing page: hierarchy and hub-spoke workload view
- Documents page: attachments and references by task
- Admin page: controlled lists and settings

Roadmap switching requirement:
- Deferred for MVP
- Keep roadmap selector architecture extensible for later rollout

New group onboarding requirement:
- A new team/group can initialize their own roadmap workspace from inside the app
- Initial setup should bootstrap default lanes, roles, permissions, and starter templates
- MVP onboarding starts from one universal standard template for all teams
- The universal template uses a generic lane set that teams can rename, add, or remove
- Blank initialization and copy-from-existing are deferred for later phases
- Multiple template choices are deferred for later phases
- Admin can create and configure group workspaces for cross-team adoption

## 3.2 Task Details page requirements
Each task should include:
- Title
- Description
- Start date
- Due date
- Major milestones
- Link to the related application
- User group or stakeholder group
- Attached documents
- Owners and contributors
- Status
- Priority
- Risk flag and notes
- Change history (PM/Admin visibility in MVP; includes roadmap-level and task/subtask-level changes)

Task drill-down experience:
- The home roadmap remains high-level (epics or major workstreams)
- Clicking a task opens that task detail page
- The detail page includes a second roadmap visualization focused on that task
- The second roadmap shows child tasks/subtasks, dependencies, and milestone checkpoints
- PM/Admin can add and edit subtasks from the task drill-down view
- Basic Users can view subtask detail but cannot edit
- Subtasks use the same field model as parent tasks (description, due date, milestones, app link, user group, docs, and related metadata)
- Every subtask stores a required parentTaskId to support hierarchy and roll-up
- Parent task progress auto-calculates from child subtask progress using estimate-based weighting in MVP
- Estimate unit for weighted rollup in MVP: hours
- Users can move between parent task view and child-task timeline without losing context

## 3.3 Staffing hierarchy and hub-spoke view
- Hub node: team lead, program lead, or portfolio owner
- Spoke nodes: individuals or pods assigned to active work
- Link edges: assignment relationships from people to tasks
- Capacity indicators: allocation percentage and availability
- Risk indicators: overloaded team member, single point of failure, unassigned critical task

## 3.4 Feedback and risk signaling (MVP first)
- Build task flags and short comments first before advanced discussions
- A team member can flag a task when timeline confidence is low or opportunity exists to accelerate
- Basic Users can flag any task they can view on the roadmap
- MVP flag types: At Risk, Scope Unclear
- Flags surface directly on the roadmap and on the task details page
- PM and Admin can resolve or close flags
- Resolving a flag requires a short resolution note (no silent close)
- Resolution notes are visible to internal task viewers (Admin/PM/Basic User) and hidden from invited guests
- Roadmap lifecycle status is not required in MVP
- Admin review is required for flag submissions and flag resolutions
- Admin review SLA for flags: same day
- Notification cadence: one immediate notification at flag creation, then one reminder per business day until reviewed
- Business-day reminder timezone in MVP: Eastern Time (ET)
- Business-day definition in MVP: Monday-Friday regardless of holidays
- Reminder delivery channels in MVP: both in-app and email
- Reminder emails include direct deep link to the flagged task review screen
- In-app notifications remain visible until the related flag is reviewed
- Admin/PM can manually mark in-app reminders as read before flag review
- Marking a reminder as read does not pause reminder cadence; reminders pause only after flag review
- Keep the first version lightweight: one short comment per flag, no threaded discussion in MVP

## 4. Proposed Information Architecture

## 4.1 Route map
- /roadmaps
- /roadmaps/:roadmapId
- /groups/new
- /tasks
- /tasks/:taskId
- /staffing
- /documents
- /admin

## 4.2 Navigation model
- Top nav for core pages
- Group onboarding entry point in admin/navigation for new-team initialization
- Context panel on each page for filters and quick stats
- Cross-links from timeline bars to task details
- Cross-links from task details to staffing and documents

## 5. Target Data Model (first design)

## 5.1 Core entities
- Task
- Subtask (Task record with parentTaskId)
- Milestone
- Person
- Team
- Assignment
- Document
- UserGroup
- Comment
- AuditLog

## 5.2 Key Task fields
- taskId
- parentTaskId (nullable for top-level tasks, required for subtasks)
- title
- description
- lane
- status
- priority
- startDate
- dueDate
- estimatedEffortHours (hours)
- owners[]
- contributors[]
- userGroupId
- appLink
- riskLevel
- progressPercent (rolled up from child subtasks using estimatedEffortHours when parent has children)
- confidence
- source
- createdAt
- createdBy
- updatedAt
- updatedBy

## 5.3 Relationships
- Task has many Milestones
- Task has many Documents
- Task has many Assignments
- Task can have many child Tasks via parentTaskId
- Child Task belongs to one parent Task
- Parent Task progress is derived from child subtask progress with estimate-based weighting in MVP
- Person has many Assignments
- Team has many People
- Task belongs to one UserGroup (or many in phase 2)

## 6. Azure Hosting Strategy (recommended baseline)

## 6.1 Service blueprint
- Frontend: Azure Static Web Apps (React)
- API: Azure Functions (Node/TypeScript)
- Data: Azure SQL Database (serverless, cost-first default for MVP)
- Database backup retention in MVP: short/default retention to minimize cost
- Environment strategy for MVP: dev-only pilot to prove value before adding test/prod
- File storage: Azure Blob Storage for task documents
- File handling model: direct file upload from app to secure storage path (via API-issued upload authorization)
- Identity: Microsoft Entra ID for team sign-in
- Secrets: Azure Key Vault
- Telemetry: Application Insights
- CI/CD: GitHub Actions via azd pipeline

## 6.2 Access and security model
- Entra ID login required for all users
- Role-based app access
- Roles to start: Admin, PM, Basic User, Guest Viewer (Invited)
- PM permissions: full roadmap operation, including create/edit/delete tasks, add employees, change task allocations, upload/delete any task documents, and manage swim lanes (add/edit/remove)
- Basic User permissions: read-only access across the entire roadmap, ability to submit flags with short comments on any visible task, and ability to upload documents
- Basic User delete rule: can delete only documents they uploaded
- Guest Viewer (Invited) permissions: view-only access; can view staffing details; no flag creation, no comments, no visibility into flags/comments/resolution notes/reminder activity, and no attachment view/download access
- Audit/change history visibility: PM/Admin in MVP for both roadmap-level and task/subtask-level changes
- Admin permissions: unrestricted full access across all app features and data (can do and see everything), including all PM capabilities
- API authorization checks per role
- Document access scoped to task/user group policy
- Audit logging for create/edit/delete actions

## 6.3 Why this baseline
- Fast path from current React app to production hosting
- Good support for internal team access and role controls
- Scales from small team to enterprise use
- Keeps costs predictable in early rollout

## 7. Delivery Roadmap to Reach Vision

## Phase 0: Finalize product decisions
- Confirm pages, roles, and MVP scope
- Confirm data ownership and governance
- Confirm success metrics for launch
- Run MVP in dev environment only for leadership validation
- Pilot duration: 60 days before leadership evaluation
- Leadership readout presenter assignment is deferred and non-blocking

## 7.1 Pilot Success Metrics (Accepted)
- Planning speed metric: median days from new work identified to task plan approved
- Execution reliability metric: percentage of tasks completed by due date
- Risk management effectiveness metric: same-day review rate for At Risk/Scope Unclear flags and median days to resolve

## 7.2 Phase 1 Build Checklist (Concrete)
- Add route structure for roadmap, tasks, task details, staffing, documents, admin, and new-group onboarding
- Implement Microsoft Entra sign-in with support for internal users and invited guest viewers
- Implement role enforcement for Admin, PM, Basic User, and Guest Viewer permissions
- Replace local storage with Azure SQL serverless persistence (tasks, subtasks, lanes, flags, documents, audit events)
- Implement parent-child task hierarchy and estimate-weighted parent progress roll-up
- Build task flag workflow (At Risk, Scope Unclear) with required resolution notes
- Build Admin review queue with same-day SLA tracking
- Implement reminder engine: immediate notification on new flag plus one business-day reminder cadence
- Implement reminder delivery channels: in-app and email with deep links
- Implement reminder behavior controls: read state allowed, reminders continue until review completion
- Build direct file upload to Azure Blob Storage via API-issued upload authorization
- Enforce document permissions: Basic User delete own uploads only; invited guests cannot view/download attachments
- Build lane management controls (add/edit/remove) for PM/Admin with typed DELETE safety confirmation
- Build PM/Admin-only audit history views for roadmap and task/subtask changes
- Build new-group initialization flow using one universal template with generic configurable lanes
- Add telemetry for pilot success metrics and leadership readout reporting
- Configure dev-only environment deployment pipeline and smoke-test checklist

## Phase 1: Foundation hardening
- Split current single-page app into route-based pages
- Introduce backend API and shared database
- Replace localStorage with persistent server data
- Add Entra sign-in
- Add MVP feedback flags and short comments
- Add Admin review queue for flag activity with same-day SLA
- Add new-group onboarding flow to initialize workspace and starter roadmap template
- Use one universal onboarding template for all new groups in MVP
- Provide lane configuration controls (rename, add, remove) with PM/Admin permission
- Lane removal behavior: prompt for confirmation plus typed DELETE; on confirm, remove the lane and all tasks/subtasks assigned to it

## Phase 2: Task details and documents
- Build full Task Details page
- Add due dates and structured milestones
- Add app links and user groups
- Add Blob-based file attachments
- Add direct in-app upload flow for task/subtask attachments
- Enforce uploader-based delete permissions for Basic Users
- Add subtask create/edit flow on task drill-down page
- Ensure subtask schema parity with parent task fields
- Implement parent-child hierarchy persistence with parentTaskId

## Phase 3: Staffing intelligence
- Build staffing hierarchy view
- Implement hub-spoke assignment graph
- Add capacity planning and overload alerts

## Phase 4: Operations and governance
- Add audit trail and activity feeds
- Add notifications and reminders
- Add dashboards for delivery health and workload

## 8. MVP Definition (suggested)

MVP should include:
- Secure sign-in
- Roadmap page
- Tasks page
- Task Details page with due dates, milestones, app link, user group, and documents
- Subtask add/edit capability on task drill-down page (PM/Admin)
- Subtasks with same fields as tasks and required parent-child linkage
- Parent task progress auto-rollup from subtasks weighted by estimate
- Estimate unit for weighted progress: hours
- Direct in-app file upload for task and subtask attachments
- Role-based attachment delete rules (Basic User: own uploads only; PM/Admin: any)
- Invited guests cannot view or download task/subtask attachments
- Invited guests can view staffing details (names, roles, workload focus)
- New-group initialization workflow for cross-team adoption
- Staffing page with hierarchy and assignment visibility
- Shared backend persistence
- PM/Admin access to full roadmap and task/subtask change/audit history
- Task-level flags with short comments and resolution status
- Required resolution note when PM/Admin marks a flag resolved
- Resolution notes visible to internal users only (hidden from invited guests)
- Admin review queue for open and resolved flags with same-day SLA
- Overdue Admin reviews send one reminder per business day until reviewed (no escalation in MVP)
- Reminder timezone for business-day cadence: Eastern Time (ET)
- Reminder business-day definition: Monday-Friday regardless of holidays
- Reminder channels: in-app notifications and email
- Reminder email format includes a task-specific review deep link
- In-app notifications persist until the corresponding flag is reviewed
- Admin/PM can manually mark in-app reminders as read before review completion
- Read state does not stop reminders; reminder schedule stops only when review is completed

## 9. Risks and Dependencies

- Data quality and ownership rules are not yet defined
- Holiday-aware reminder scheduling is deferred beyond MVP
- Document retention and compliance requirements need validation
- Timeline interactions will need conflict handling when multiple users edit the same task

## 10. Decision Log

Use this section to capture decisions as we finalize vision.

- Decision: App name = Project Roadmap
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Core role model = Admin, PM, Basic User, Guest Viewer (Invited)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: PM can manage tasks, staffing assignment, and allocations
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: PM permissions remain as currently defined (as-is)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Admin can do and see everything across the app
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Task drill-down must include a nested roadmap view for child work
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Build task flags and short comments in MVP
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Basic User has read access to the entire roadmap
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Basic User can flag any task they can see
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP flag types = At Risk, Scope Unclear
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Flag resolution requires PM/Admin note
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Task drill-down supports add/edit subtasks
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Subtasks use the same fields as tasks
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Subtasks require parentTaskId hierarchy linkage
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Parent task progress auto-calculates from child subtasks
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Parent task progress rollup uses estimate-based weighting
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Estimate unit for weighted rollup = hours
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Task/subtask documents are uploaded directly in the app
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Any authenticated role can upload task documents
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Basic User can delete only their own uploaded documents
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Roadmap environment switching is deferred for now
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP includes self-service new-group initialization
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: New group initialization uses a standard template in MVP
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP uses one universal onboarding template for all teams
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Universal template uses generic lanes that teams can rename, add, or remove
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Swim lane add/edit/remove permissions are PM/Admin
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Lane removal prompts confirmation and then removes lane plus all assigned tasks when confirmed
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Lane removal requires typed DELETE confirmation
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Roadmap lifecycle status is not required in MVP
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Admin review is required for flag submissions and resolutions
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Admin flag review SLA = same day
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Missed same-day SLA triggers repeated re-notification (no escalation in MVP)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Reminder cadence = immediate on flag creation, then once per business day until reviewed
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Business-day reminder timezone = Eastern Time (ET)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Reminder business days = Monday-Friday regardless of holidays
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Reminder channels = both in-app and email
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Reminder emails include direct link to flagged task review
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: In-app reminders stay visible until flag review
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Admin/PM can manually mark reminders as read before review
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Reminders pause only once flag review is completed
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Flag/comments/resolution notes are hidden from invited guests
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Invited guests cannot view or download task/subtask attachments
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Invited guests can view staffing details
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Full roadmap and task/subtask change/audit history visibility is PM/Admin in MVP
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP database choice is cost-first Azure SQL Database (serverless)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP uses short/default backup retention to minimize cost
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: MVP runs in dev environment only during pilot phase
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Pilot success metrics are planning speed, execution reliability, and risk management effectiveness
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Dev-only pilot duration is 60 days before leadership review
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Leadership readout presenter assignment is deferred (non-blocking)
- Status: Accepted
- Owner: Team lead
- Date: 2026-04-19

- Decision: Azure hosting pattern
- Status: Accepted
- Owner: Team lead and technical lead
- Date: 2026-04-19

- Decision: MVP page set and role permissions
- Status: Pending
- Owner: Team lead
- Date: 2026-04-19
