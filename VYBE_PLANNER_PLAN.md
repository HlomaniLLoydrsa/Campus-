# VYBE Planner — Architecture Audit & Plan

## Phase 1 — Audit

**Existing calendar:** There is **no dedicated calendar/planner module**. The only calendar-like
feature is `/events` (social events stored as `posts` with `eventData` JSON). So Planner is a
**greenfield build** — no existing planner tables/routes to conflict with.

**Reusable foundations (do NOT rebuild):**
- DB access via `getDb()` (Turso, async), tables added with `CREATE TABLE IF NOT EXISTS` + `ensureColumn` migrations — deployment-safe, no destructive changes.
- Auth: `requireUserId()` / `getSessionUserId()` — every planner row is scoped to the session user; never trust client ids.
- Notifications: `notifications` table + `getNotificationHref()` for clickable reminders (add `relatedType: 'planner'`).
- Academy: `academy_resources` — link (by reference) to study sessions/tasks, never duplicate files.
- Events: `posts.eventData` — surface saved social events on the planner calendar (read-only reference).
- Timestamp handling: `parseDate()` (UTC-safe) already fixed.

**Conflicts:** none. Planner lives at `/planner` and its own API namespace `/api/planner/*`. It will be **route-local** (fetches its own data) so it doesn't bloat the global `AppContext` or the 2s poll.

## New tables (all scoped by userId, prefixed ids, ISO createdAt)
```
planner_semesters(id, userId, name, startDate, endDate, active, createdAt)
planner_modules(id, userId, semesterId, code, name, color, icon, archived, createdAt)
planner_topics(id, userId, moduleId, name, status, priority, notes, createdAt)
   status: not-started | learning | revising | confident | mastered
planner_tasks(id, userId, moduleId, title, type, description, dueDate, dueTime,
              priority, status, progress, estimatedHours, topicIds, notes, pinned, createdAt)
   type: assignment|test|exam|project|presentation|quiz|practical|reading|research|other
   priority: low|medium|high|critical ; status: not-started|in-progress|completed|cancelled
planner_sessions(id, userId, moduleId, topicId, taskId, title, date, startTime, endTime,
                 durationMin, goal, status, actualMin, reflection, planId, createdAt)
   status: planned|completed|partial|skipped
planner_plans(id, userId, moduleId, taskId, goal, targetDate, createdAt)
planner_prefs(userId, remindAssignments, remindExams, remindSessions, remindOverdue, ...)
```
Indexes on userId, moduleId, dueDate, date, status.

## API endpoints (`/api/planner/*`, all auth + ownership)
- `dashboard` (aggregate: due today, overdue, upcoming exams, today's sessions, workload)
- `modules` (+[id]) ; `topics` ; `tasks` (+[id]) ; `sessions` (+[id]) ; `plans` (generate) ; `semesters` ; `prefs`

## Phased build (working build + local commit after each)
2. Core: DB + modules/tasks/topics/sessions APIs + Planner dashboard + task CRUD + countdowns + agenda/calendar.
3. Modules + Topics UI (workspaces, tracker).
4. Study sessions + Study Mode + manual plan builder.
5. Exam centre + rescheduling.
6. Academy integration + reminders.
7. Semester overview + workload/progress + AI-ready read APIs + Home/Discover wiring.

## Rules honoured
Mobile-first; no AI dependency (planner fully works without it, AI-ready APIs only); non-stressful labels ("self-reported progress", "planned study time"); Planner reached via Discover (not crammed into bottom nav).
