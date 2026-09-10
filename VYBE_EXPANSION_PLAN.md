# VYBE — Expansion Architecture Audit & Phased Plan

This is the Phase 1 (audit) + Phase 2 (schema/plan) deliverable for turning VYBE into a
student super-app, **without breaking anything that works today**.

---

## PART 1 — Current architecture (what exists)

**Stack**
- Next.js 15 (App Router) + TypeScript + Tailwind. React 19.
- DB: **Turso (libSQL)** via `@libsql/client`, all access behind `getDb()` in `src/lib/db.ts` (async wrapper mimicking better-sqlite3). Local `file:campus.db` fallback for dev.
- Auth: signed **HTTP-only session cookie** (`vybe_session`), verified server-side via `requireUserId()` / `getSessionUserId()` in `src/lib/auth.ts`. Passwords: scrypt.
- Storage: env-aware `src/lib/storage.ts` — Netlify Blobs in prod, disk locally.
- Client state: one big `AppContext` that fetches everything and polls every 2s (`pollRealtime`) for near real-time.
- PWA: manifest + service worker + icons, installable, offline-aware.
- Deployment: Netlify (auto-deploy from GitHub `main`).

**Existing DB tables** (all `CREATE TABLE IF NOT EXISTS` + additive `ensureColumn` migrations, deployment-safe):
`users, connections, connection_requests, notifications, posts, comments, conversations, messages, games, stories, secret_admirers, wingman_suggestions, event_participants, isawyou_responses, reports, blocks, badges`.

**Existing API routes** (`src/app/api/**`): auth (login/signup/logout), users(+[id],+[id]/stats), posts(+[id],+[id]/respond), comments (via posts), requests(+[id]), connections, conversations, messages, notifications, games(+[id]), stories, secret-admirers, wingman, events, badges, blocks, reports, upload, uploads/[filename], heartbeat, isawyou.

**Reusable primitives the expansion can lean on** (this is the key insight — we don't rebuild these):
- **Messaging**: `conversations` + `messages` already support "drop a message into someone's inbox" (used by shared posts, game invites, I-Saw-You, story replies). Any new module ("message seller", "message tutor", "contact about accommodation") reuses this exact pattern.
- **Notifications**: `notifications` table + `getNotificationHref()` mapping + clickable nav. New modules just insert a notification row with a `relatedType`/`relatedId`.
- **Uploads**: `/api/upload` (auth-gated) + `saveImage()` — reuse for every module that needs photos.
- **Reports/blocks**: `reports` + `blocks` tables already exist and are generic (`targetType`, `targetId`) — Trust & Safety for new modules mostly reuses these.
- **Auth pattern**: every new route uses `requireUserId()` and derives ownership from the session (never trusts client ids).

---

## PART 2 — Impact assessment

**Good news:** the foundation is well-suited to expansion. The biggest wins are already generic (messaging, notifications, uploads, reports, session auth). New modules are mostly "a table + CRUD routes + list/detail/create screens + wire into search/notifications/chat."

**Realistic scope:** the 14 requested modules are, combined, **months of work**. Each is its own mini-app. Attempting them all at once would be low quality and would risk the working app. So we build **one complete, tested module at a time**, each fully wired into profile + search + chat + notifications before moving on.

**Risks to manage:**
- `AppContext` fetches everything on load; adding 14 modules there would bloat it and slow the app. → New modules should **fetch their own data on their own pages** (route-local), not all through AppContext. Only cross-cutting things (notifications) stay global.
- The 2s poll already fetches 7 endpoints. → Do NOT add module data to the poll. Keep the poll to notifications/messages/requests/stories.
- Turso is SQLite — fine for this scale, but we must add **indexes** for search/filter columns.

---

## PART 3 — Database schema plan (Phase 2)

All new tables follow the existing conventions: `TEXT` primary keys (`prefix_<uuid8>`), `createdAt TEXT DEFAULT (datetime('now'))`, JSON for arrays, added via `CREATE TABLE IF NOT EXISTS` in `initializeDb()` so production migrates safely on next deploy. User data is **never duplicated** — everything references `users.id`.

Proposed tables (built incrementally, not all at once):

```
academy_resources(id, uploaderId, title, type, institution, faculty, course, module,
                  year, semester, fileUrl, fileType, fileSize, downloads, createdAt)
academy_ratings(id, resourceId, userId, rating, createdAt)   UNIQUE(resourceId,userId)
academy_saves(id, resourceId, userId, createdAt)             UNIQUE(resourceId,userId)

lost_found(id, reporterId, kind['lost'|'found'], itemName, category, description,
           photo, location, campus, dateOn, status['open'|'recovered'], secretQ, secretA, createdAt)

marketplace_listings(id, sellerId, title, description, price, category, condition,
                     images, campus, status['available'|'sold'], createdAt)
marketplace_saves(id, listingId, userId, createdAt)          UNIQUE(listingId,userId)

services(id, providerId, name, description, category, rate, campus, availability,
         portfolio, createdAt)
service_reviews(id, serviceId, userId, rating, comment, createdAt)

tutors(id, userId, institution, subjects, experience, rate, availability, createdAt)
tutor_sessions(id, tutorId, studentId, subject, status, note, createdAt)

accommodation(id, ownerId, kind, title, description, price, area, distanceKm, rooms,
              furnished, utilities, wifi, availableFrom, images, campus, createdAt)
roommate_profiles(id, userId, campus, course, year, area, budget, lifestyle, moveIn, createdAt)

help_questions(id, askerId, title, body, category, campus, createdAt)
help_answers(id, questionId, userId, body, helpful, createdAt)

noticeboard(id, authorId, title, body, category, official[0|1], createdAt)

opportunities(id, postedById, title, org, type, description, link, deadline, campus, verified, createdAt)
opportunity_saves(id, opportunityId, userId, createdAt)

communities(id, name, description, banner, category, official, ownerId, createdAt)
community_members(id, communityId, userId, role, createdAt)  UNIQUE(communityId,userId)
community_posts(id, communityId, authorId, content, images, createdAt)

campus_directory(id, name, description, category, building, hours, contact, campus, createdAt)

calendar_items(id, userId, title, type, date, time, reminder, done, sourceType, sourceId, createdAt)
```

**Indexes** to add per table: `userId`/owner, `campus`, `course`/`module`, `category`, `status`, `createdAt`. Plus a plan for search (Part 4).

**Reused, not rebuilt:** notifications, conversations/messages (all "message X" buttons), reports (generic `targetType`), blocks, upload.

---

## PART 4 — Universal Search & AI (later phases)

- **Search:** a single `/api/search?q=` route that runs `LIKE`/FTS queries across the relevant tables and returns typed, grouped results (People, Academy, Marketplace, Tutors, Lost&Found, Opportunities, Events, Communities, Help). Turso supports SQLite FTS5 if we want ranking later; start with indexed `LIKE`.
- **AI assistant:** a thin `/api/assistant` that interprets the query, calls the same search internally, and returns a templated summary ("I found 8 COS301 resources…"). **Strictly grounded** — it only reports rows that exist in VYBE; no invented data. (Optional LLM later; the foundation is deterministic.)

---

## PART 5 — Recommended build order (matches your Phase plan)

Each phase = its own table(s) + auth-gated CRUD API + mobile-first list/detail/create UI + wire into Discover, Search, Chat, Notifications, Profile. **After each phase: build passes, migrations safe, mobile checked, no regressions, then commit.**

1. **Discover redesign** (small, high-impact) — turn Explore into the ecosystem gateway with category cards (Academy, Marketplace, Lost&Found, Jobs, Accommodation, Tutors, Opportunities, Communities, Help, Noticeboard, Campus Services, Calendar). Cards route to modules as they ship (graceful "coming soon" until built).
2. **VYBE Academy + Past Papers** — first full module (upload/download/search/save/rate/report). Establishes the pattern.
3. **Lost & Found** (+ matching suggestions).
4. **Marketplace** (+ message seller).
5. **Gigs/Services + Tutors**.
6. **Accommodation + Roommate**.
7. **Help + Noticeboard + Opportunities**.
8. **Communities + Campus Directory**.
9. **Calendar + Universal Search**.
10. **Notifications/Home/Profile cross-integration pass**.
11. **AI assistant foundation**.
12. **Security audit + mobile/PWA pass + production build**.

---

## PART 6 — What I recommend we do next

Two concrete options — your call:

- **Option A (recommended): ship Discover redesign + Academy first.** You get a visible, real new module end-to-end (with the interconnection pattern) that proves the quality bar before we invest in the rest. ~1 focused build.
- **Option B: I scaffold the DB schema for all modules now** (tables + indexes + migrations, no UI), so the data layer is ready, then build UIs module by module.

Either way, we go **phase by phase with a working build at each step** — never one giant risky change.

Current bug fixes from this session are committed locally and **not yet pushed** (per your instruction). Say the word to push, and tell me A or B to start the expansion.
