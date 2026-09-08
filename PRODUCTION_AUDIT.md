# VYBE — Production / PWA Readiness Audit

This document summarizes the work done to make VYBE deployable to the internet as an
installable Progressive Web App that runs independently of your PC.

---

## A. What I changed

**PWA (new)**
- `public/manifest.webmanifest` — name, short name, description, `standalone` display, portrait orientation, theme `#1A3F75`, background `#00002A`, icons.
- `public/icons/` — generated `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` (from `icon.svg`, using the app's navy branding — no gold).
- `public/sw.js` — service worker. Network-first for navigations with an offline fallback; cache-first for static assets. **Never caches `/api/*` or any private/authenticated data.**
- `public/offline.html` — branded offline fallback screen.
- `src/components/ServiceWorkerRegister.tsx` — registers the SW on the client (mounted in root layout).
- `src/components/OfflineBanner.tsx` — shows a banner when the device goes offline (mounted in `AppShell`).
- `src/app/layout.tsx` — added full PWA metadata: `manifest`, `themeColor`, `viewport` (device-width, `viewport-fit=cover`), `appleWebApp` (standalone), icons, `metadataBase` from `NEXT_PUBLIC_APP_URL`.

**Security (new/changed)**
- `src/lib/auth.ts` (new) — password hashing with **scrypt + per-user salt**, backward-compatible verification of old SHA-256 hashes (auto-upgraded on next login), and a **signed, HTTP-only session cookie** (`vybe_session`) with helpers `setSessionCookie` / `clearSessionCookie` / `getSessionUserId`.
- `src/app/api/auth/login/route.ts` — verifies via `verifyPassword`, upgrades legacy hashes, sets the session cookie.
- `src/app/api/auth/signup/route.ts` — hashes with scrypt, sets the session cookie.
- `src/app/api/auth/logout/route.ts` (new) — clears the cookie and marks the user offline; called by the client `logout()`.
- `src/app/api/users/route.ts` and `src/app/api/users/[id]/route.ts` — **stopped leaking the password hash** (explicit safe columns; email is returned only to the account owner).
- `src/app/api/users/[id]/route.ts` — `PATCH` and `DELETE` now **require a valid session that matches the target user** (you can only edit/delete your own account).
- `src/app/api/requests/[id]/route.ts` — `DELETE` now requires a logged-in party to the request.

**Environment / config**
- `.env.example` — documents `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`.
- `.gitignore` — now ignores `.env`, `.env.local`, `.env.production`, `.env.development` (previously only `.env*.local`).

**Error handling / mobile**
- `src/app/error.tsx` — no longer shows raw error text to production users (dev only).
- `src/lib/apiError.ts` (new) — reusable friendly JSON error helpers that log server-side without leaking details.
- `src/app/globals.css` — `overflow-x: hidden` guard against horizontal scroll, safe-area utilities, minimum 40px touch targets on touch devices.
- `src/components/layout/BottomNav.tsx` — respects the iOS/Android safe-area inset (home indicator) in standalone mode.
- Fixed the loading spinner logo from "C" to "V".

---

## B. Database — SQLite can NOT stay as `better-sqlite3`; already on Turso

`better-sqlite3` writes to a local file on the server's disk, which does not work on serverless
hosts (read-only/ephemeral filesystem, no shared state between function instances). This project
was **already migrated** (in earlier work) to **Turso (libSQL)** via `@libsql/client`, which is a
cloud/serverless-friendly SQLite-compatible database.

- All DB access goes through a single reusable layer: `src/lib/db.ts` → `getDb()`.
- No route imports a driver directly; `better-sqlite3` is not a dependency and is not imported anywhere.
- In production it reads `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. If those are unset it falls back to a local `file:campus.db` for development only.
- All existing tables/relationships are preserved (users, connections, connection_requests, notifications, posts, comments, conversations, messages, games, stories, secret_admirers, wingman_suggestions, event_participants, isawyou_responses, reports, blocks, badges).
- To change providers later, you only touch `src/lib/db.ts`.

**Verdict:** keep Turso. It is the correct production choice and requires no code changes — only the two env vars.

---

## C. PWA — confirmed

- **Manifest:** `public/manifest.webmanifest`, linked via layout metadata. ✅
- **Service worker:** `public/sw.js`, registered client-side; safe caching only (no API/private data). ✅
- **Icons:** 192, 512, maskable 512, apple-touch 180. ✅
- **Installability:** manifest + SW + HTTPS (from host) + icons ⇒ Android Chrome shows "Install app". ✅
- **Standalone mode:** `display: standalone` + `appleWebApp.capable`. ✅
- **Caching:** app shell + static assets cached; navigations fall back to `/offline.html` when offline; API always hits the network. ✅

Smoke test against the production build served `manifest.webmanifest`, `sw.js`, `offline.html`, and `icon-192.png` all with HTTP 200.

---

## D. Security — full sweep complete

### Authentication / authorization approach
- Identity comes from a **signed, HTTP-only session cookie** (`vybe_session`) set on login/signup and cleared on logout. In production it is `Secure` (HTTPS-only) and `SameSite=Lax`.
- Every private API route now derives the current user with **`requireUserId()`** (from `src/lib/auth.ts`), which reads the signed cookie and returns **401** if there's no valid session. Routes **never trust** a `userId`, `senderId`, `fromUserId`, `creatorId`, etc. supplied in the query string or body — those are ignored for identity.
- Passwords are hashed with **scrypt + per-user salt**; legacy SHA-256 hashes still verify and are upgraded to scrypt on next login.

### Vulnerabilities found → fixed (IDOR / privilege escalation)
| Route | Was | Now |
|---|---|---|
| `GET /api/users`, `GET /api/users/[id]` | `SELECT *` leaked **password hash** + email | public columns only; email only to the owner |
| `PATCH`/`DELETE /api/users/[id]` | anyone could edit/delete any account | requires session matching the target (else 403) |
| `GET/POST/PATCH /api/messages` | read anyone's DMs via `?userId=`; send as any `senderId` | reads your own conversations; sender = session; participant + connection checks |
| `GET/PATCH /api/notifications` | read/mark anyone's via `?userId=` | your own only; markRead scoped to your id |
| `GET/POST /api/requests`, `PATCH/DELETE /api/requests/[id]` | send/accept/reject/delete as anyone | sender/actor = session; only a party may act; outsiders 403 |
| `GET/DELETE /api/connections` | list/remove anyone's connections | scoped to session |
| `POST /api/conversations` | create as any user | creator = session; connection-gated |
| `POST /api/posts`, `PATCH/DELETE /api/posts/[id]`, `respond` | post/edit/delete as anyone | author/owner = session; owner-only edit/delete |
| `POST /api/stories` | post story as anyone | author = session |
| `POST/PATCH /api/games` | create/act as anyone | creator/actor = session |
| `POST /api/events` | join/approve as anyone | actor = session (organizer checks still apply) |
| `/api/secret-admirers`, `/api/wingman` | act/read as anyone | session + party/recipient checks |
| `GET /api/badges`, `/api/blocks`, `POST /api/reports` | keyed on client id | session only |
| `POST /api/upload` | unauthenticated uploads | requires a session |
| `POST /api/auth/register` | created users with a **client-chosen id** (no auth) | **route removed** (was unused) |

### Verified by test (dev mode, since production cookies are HTTPS-only)
- Sender spoofing blocked: sending `fromUserId="SPOOF"` / `senderId="SPOOF"` still records the **real session user**.
- Full social flow intact: A sends request → B is notified → B accepts → connection created → A messages → **B receives it**.
- Read isolation: user A calling `/api/notifications` gets only A's notifications, never B's.
- Unauthenticated request → **401**. Outsider deleting someone else's request → **403**.

### Remaining / accepted
- The client still *sends* `userId`/`senderId` in some bodies; these are now **ignored** server-side (harmless, no client changes required).
- Password hashing is scrypt (strong). If you prefer, bcrypt/argon2 can be swapped in `src/lib/auth.ts` later.
- Consider host/CDN-level **rate limiting** (defense-in-depth; not required to launch).

**CORS/CSRF:** same-origin app, so no CORS concerns. Cookie is `SameSite=Lax`, mitigating cross-site CSRF; `HttpOnly` prevents JS/XSS token theft.

---

## E. Deployment steps (you do these)

You need two external accounts. Everything in the code is ready; you only add credentials.

**1. Create a production database (Turso — free tier)**
- Sign up at https://turso.tech
- Create a database, then copy its **Database URL** (`libsql://...`) and create an **auth token**.

**2. Push to GitHub** (already connected: `github.com/HlomaniLLoydrsa/Campus-`). It's up to date.

**3. Deploy to a host that runs Next.js server code.** Two good free/low-cost options:

- **Vercel (simplest for Next.js):**
  1. Go to https://vercel.com → New Project → import the `Campus-` repo.
  2. Framework preset: Next.js (auto-detected). Build command `next build`, output handled automatically.
  3. Add Environment Variables (below).
  4. Deploy. You get an HTTPS URL like `https://vybe.vercel.app`.

- **Netlify (config already in repo — `netlify.toml` + `@netlify/plugin-nextjs`):**
  1. https://app.netlify.com → Add new site → Import from GitHub → pick `Campus-`.
  2. Build command `npm run build`, publish `.next` (already in `netlify.toml`).
  3. Add Environment Variables (below).
  4. Deploy. Note: image uploads use Netlify Blobs automatically on Netlify.

**4. Environment variables to set in the host dashboard:**
```
TURSO_DATABASE_URL   = libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN     = (the token from Turso)
AUTH_SECRET          = (a long random string — generate with:
                        node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
NEXT_PUBLIC_APP_URL  = https://your-deployed-domain   (no trailing slash)
```
`AUTH_SECRET` is required so session cookies are signed with a stable secret.

**5. Verify local build (optional, already passing):**
```
npm install
npm run build
npm run start
```

> Image uploads note: on **Vercel** the local-disk upload path won't persist (ephemeral FS). The code already uses Netlify Blobs on Netlify. If you deploy to Vercel and want persistent uploads, use a blob store (e.g. Vercel Blob / S3) — tell me and I'll wire it into `src/lib/storage.ts` (it's already the single place to change).

---

## F. Installing on your Android phone (after deploy)

1. Open **Chrome** on the phone and go to your deployed HTTPS URL.
2. Register or log in and use the app normally.
3. Tap the **⋮** menu (top-right) → **Install app** (or **Add to Home screen**).
4. Confirm. The **VYBE** icon appears on your home screen.
5. Open it from the home screen — it launches in **standalone** mode (no browser bars), like a native app.
6. Closing and reopening it does **not** require your PC — it talks to the deployed server.

(iOS: Safari → Share → Add to Home Screen. iOS PWA support is more limited but works.)

---

## G. What happens when you push code updates

```
Edit code → git push to GitHub → host auto-builds & deploys → live site updates
→ users' PWA loads the new version on next open (service worker updates in the background)
```
For normal web/PWA changes you do **not** rebuild anything on your PC and you do **not** ship a new APK. Users just get the latest web app automatically. (If you later wrap it with Capacitor for the Play Store, only native shell changes would need a new APK; web changes still flow through automatically.)

---

## H. Testing performed

- **Production build:** `next build` completes successfully with all routes. ✅
- **Auth:** signup → 201 and sets an `HttpOnly` `vybe_session` cookie; login → 200; wrong password → 401; unauthenticated private request → 401. ✅
- **Data-leak fix:** `GET /api/users` response contains no `password` field. ✅
- **Spoofing blocked:** sending `fromUserId`/`senderId="SPOOF"` records the real session user instead. ✅
- **Read isolation:** user A's `/api/notifications` returns only A's notifications, never another user's. ✅
- **Authorization:** editing/deleting another user's profile → **403**; own → **200**. Outsider deleting someone else's request → **403**. ✅
- **End-to-end social flow:** A sends request → B notified → B accepts → connection created → A messages → B receives it. ✅
- **PWA assets:** `manifest.webmanifest`, `sw.js`, `offline.html`, `icons/icon-192.png` all serve 200. ✅
- **Cleanup:** all temporary test accounts created during testing were deleted.

---

## I. Upload / storage status

- **Where images live:** `src/lib/storage.ts` (the single source of truth). Images are **files in cloud object storage**, not in the database and not base64.
  - On **Netlify** (`process.env.NETLIFY` present) → **Netlify Blobs** (persistent), served via `/api/uploads/[filename]`.
  - **Locally** (dev) → `public/uploads/` on disk, served at `/uploads/[filename]`.
- **Uploads now require a signed-in session** (`POST /api/upload` calls `requireUserId()`).
- **Vercel caveat:** Vercel is not Netlify, so the code would fall back to the local-disk branch, and Vercel's filesystem is **ephemeral** — uploaded images would disappear on redeploy/scale. On Vercel you'd need an external blob store (Vercel Blob or S3) wired into `storage.ts`. **On Netlify no extra service is needed.**

---

## J. Deployment recommendation — Netlify (for THIS project)

**Recommended: Netlify.** Reasons specific to VYBE:
1. **Image uploads work with zero extra services.** The upload layer already integrates Netlify Blobs; on Vercel you'd have to add and wire a separate blob store before uploads would persist.
2. The repo already ships `netlify.toml` + `@netlify/plugin-nextjs`, so it's import-and-deploy.
3. Everything else (Next.js server routes, env vars, HTTPS, GitHub auto-deploy, PWA over HTTPS) is equivalent on both.

Choose **Vercel** only if you specifically prefer it — in which case tell me and I'll add persistent blob storage to `src/lib/storage.ts` first (otherwise uploaded pictures won't survive redeploys).

Everything else — the Turso database, sessions, and the PWA — behaves identically on either host.

---

## Future Android (Capacitor) compatibility

No conversion done yet (as requested). The architecture is already compatible:
- All API calls are **relative** (`/api/...`) with no hardcoded host, so a Capacitor shell can point at the deployed URL.
- The backend is hosted and independent of your PC.
- The PWA is standard, so the progression **Next.js → Web App → PWA → (optional) Capacitor → APK/AAB** is open when you want it.
