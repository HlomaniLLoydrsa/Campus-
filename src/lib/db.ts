import { createClient, Client } from '@libsql/client';

/**
 * Database layer backed by Turso (libSQL) so it works on Netlify's serverless platform.
 *
 * Provides an async compatibility wrapper that mimics better-sqlite3's API:
 *   const db = await getDb();
 *   await db.prepare('SELECT * FROM users WHERE id = ?').get(id);   // one row or undefined
 *   await db.prepare('SELECT * FROM users').all();                  // array of rows
 *   await db.prepare('INSERT ...').run(a, b, c);                    // execute
 *   await db.exec('CREATE TABLE ...; CREATE TABLE ...;');           // multi-statement
 *
 * Env vars required in production:
 *   TURSO_DATABASE_URL  (e.g. libsql://your-db.turso.io)
 *   TURSO_AUTH_TOKEN    (long token string)
 * If unset, falls back to a local SQLite file for development.
 */

let client: Client | null = null;
let initialized = false;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (url) {
      client = createClient({ url, authToken });
    } else {
      // Local dev fallback — a file-based libSQL database
      client = createClient({ url: 'file:campus.db' });
    }
  }
  return client;
}

interface PreparedStatement {
  get: (...args: unknown[]) => Promise<any>;
  all: (...args: unknown[]) => Promise<any[]>;
  run: (...args: unknown[]) => Promise<{ changes: number; lastInsertRowid: bigint | undefined }>;
}

interface DbWrapper {
  prepare: (sql: string) => PreparedStatement;
  exec: (sql: string) => Promise<void>;
}

const wrapper: DbWrapper = {
  prepare(sql: string): PreparedStatement {
    const c = getClient();
    return {
      async get(...args: unknown[]) {
        const res = await c.execute({ sql, args: args as any[] });
        return res.rows[0] ? rowToObject(res) : undefined;
      },
      async all(...args: unknown[]) {
        const res = await c.execute({ sql, args: args as any[] });
        return rowsToObjects(res);
      },
      async run(...args: unknown[]) {
        const res = await c.execute({ sql, args: args as any[] });
        return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
      },
    };
  },
  async exec(sql: string) {
    const c = getClient();
    // Split multi-statement SQL and run each (libSQL executeMultiple handles this too)
    await c.executeMultiple(sql);
  },
};

// libSQL returns rows as arrays with a columns map; convert to plain objects like better-sqlite3
function rowToObject(res: any): any {
  const row = res.rows[0];
  const obj: any = {};
  res.columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
  return obj;
}

function rowsToObjects(res: any): any[] {
  return res.rows.map((row: any) => {
    const obj: any = {};
    res.columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });
}

export async function getDb(): Promise<DbWrapper> {
  if (!initialized) {
    await initializeDb();
    initialized = true;
  }
  return wrapper;
}

async function initializeDb() {
  const c = getClient();
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT DEFAULT '',
      password TEXT DEFAULT '',
      avatar TEXT,
      coverImage TEXT,
      bio TEXT DEFAULT '',
      course TEXT DEFAULT '',
      faculty TEXT DEFAULT '',
      yearOfStudy INTEGER DEFAULT 1,
      interests TEXT DEFAULT '[]',
      hobbies TEXT DEFAULT '[]',
      isOnline INTEGER DEFAULT 0,
      lastSeen TEXT,
      wingmanEnabled INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      connectedUserId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'friend',
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, connectedUserId)
    );

    CREATE TABLE IF NOT EXISTS connection_requests (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'friend',
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      fromUserId TEXT,
      message TEXT NOT NULL,
      requestType TEXT,
      relatedId TEXT,
      relatedType TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'normal',
      authorId TEXT,
      ownerId TEXT,
      isAnonymous INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      likes INTEGER DEFAULT 0,
      likedBy TEXT DEFAULT '[]',
      shares INTEGER DEFAULT 0,
      savedBy TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now')),
      eventData TEXT,
      iSawYouData TEXT,
      taggedUserId TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      likedBy TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'direct',
      name TEXT,
      participants TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      creatorId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      participants TEXT DEFAULT '[]',
      data TEXT NOT NULL DEFAULT '{}',
      visibility TEXT DEFAULT 'public',
      targetUserId TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      content TEXT,
      image TEXT,
      backgroundColor TEXT DEFAULT '#6C5CE7',
      createdAt TEXT DEFAULT (datetime('now')),
      expiresAt TEXT NOT NULL,
      views TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS secret_admirers (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      revealFrom INTEGER DEFAULT 0,
      revealTo INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wingman_suggestions (
      id TEXT PRIMARY KEY,
      wingmanId TEXT NOT NULL,
      forUserId TEXT NOT NULL,
      suggestedUserId TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'joined',
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(postId, userId)
    );

    CREATE TABLE IF NOT EXISTS isawyou_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(postId, userId)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporterId TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT NOT NULL,
      reason TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blockerId TEXT NOT NULL,
      blockedId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(blockerId, blockedId)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      badgeId TEXT NOT NULL,
      earnedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, badgeId)
    );

    -- ── VYBE Academy ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS academy_resources (
      id TEXT PRIMARY KEY,
      uploaderId TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'notes',
      institution TEXT DEFAULT '',
      faculty TEXT DEFAULT '',
      course TEXT DEFAULT '',
      module TEXT DEFAULT '',
      year TEXT DEFAULT '',
      semester TEXT DEFAULT '',
      description TEXT DEFAULT '',
      fileUrl TEXT NOT NULL,
      fileType TEXT DEFAULT '',
      fileSize INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS academy_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resourceId TEXT NOT NULL,
      userId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(resourceId, userId)
    );

    CREATE TABLE IF NOT EXISTS academy_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resourceId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(resourceId, userId)
    );

    CREATE INDEX IF NOT EXISTS idx_academy_module ON academy_resources(module);
    CREATE INDEX IF NOT EXISTS idx_academy_course ON academy_resources(course);
    CREATE INDEX IF NOT EXISTS idx_academy_type ON academy_resources(type);
    CREATE INDEX IF NOT EXISTS idx_academy_uploader ON academy_resources(uploaderId);
    CREATE INDEX IF NOT EXISTS idx_academy_created ON academy_resources(createdAt);
    CREATE INDEX IF NOT EXISTS idx_academy_ratings_resource ON academy_ratings(resourceId);
    CREATE INDEX IF NOT EXISTS idx_academy_saves_user ON academy_saves(userId);

    -- ── VYBE Lost & Found ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS lost_found (
      id TEXT PRIMARY KEY,
      reporterId TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'lost',            -- 'lost' | 'found'
      itemName TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      description TEXT DEFAULT '',
      photo TEXT,
      location TEXT DEFAULT '',
      campus TEXT DEFAULT '',
      dateOn TEXT DEFAULT '',                        -- date lost/found (free text/date)
      secretQuestion TEXT DEFAULT '',                -- private ownership verification (never shown publicly)
      status TEXT DEFAULT 'open',                    -- 'open' | 'recovered'
      createdAt TEXT DEFAULT (datetime('now'))
    );

    -- Claims: someone says a found item is theirs and answers the owner's verification question.
    CREATE TABLE IF NOT EXISTS lost_found_claims (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      claimantId TEXT NOT NULL,
      answer TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',                 -- 'pending' | 'approved' | 'rejected'
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lf_kind ON lost_found(kind);
    CREATE INDEX IF NOT EXISTS idx_lf_category ON lost_found(category);
    CREATE INDEX IF NOT EXISTS idx_lf_campus ON lost_found(campus);
    CREATE INDEX IF NOT EXISTS idx_lf_status ON lost_found(status);
    CREATE INDEX IF NOT EXISTS idx_lf_reporter ON lost_found(reporterId);
    CREATE INDEX IF NOT EXISTS idx_lf_created ON lost_found(createdAt);
    CREATE INDEX IF NOT EXISTS idx_lf_claims_item ON lost_found_claims(itemId);

    -- ── VYBE Marketplace ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      sellerId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL DEFAULT 0,
      category TEXT DEFAULT 'other',
      condition TEXT DEFAULT 'good',
      images TEXT DEFAULT '[]',
      campus TEXT DEFAULT '',
      status TEXT DEFAULT 'available',            -- 'available' | 'sold'
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marketplace_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(listingId, userId)
    );

    CREATE INDEX IF NOT EXISTS idx_mkt_seller ON marketplace_listings(sellerId);
    CREATE INDEX IF NOT EXISTS idx_mkt_category ON marketplace_listings(category);
    CREATE INDEX IF NOT EXISTS idx_mkt_status ON marketplace_listings(status);
    CREATE INDEX IF NOT EXISTS idx_mkt_campus ON marketplace_listings(campus);
    CREATE INDEX IF NOT EXISTS idx_mkt_created ON marketplace_listings(createdAt);
    CREATE INDEX IF NOT EXISTS idx_mkt_price ON marketplace_listings(price);
    CREATE INDEX IF NOT EXISTS idx_mkt_saves_user ON marketplace_saves(userId);

    -- ── VYBE Gigs / Services / Tutors ─────────────────────────────
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      providerId TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'service',       -- 'service' | 'tutor'
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'other',
      rate TEXT DEFAULT '',                        -- free-text rate (e.g. "R150/hr")
      campus TEXT DEFAULT '',
      availability TEXT DEFAULT '',
      subjects TEXT DEFAULT '',                    -- tutor subjects/modules (comma list)
      experience TEXT DEFAULT '',                  -- tutor experience
      portfolio TEXT DEFAULT '[]',                 -- image URLs (JSON)
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serviceId TEXT NOT NULL,
      userId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(serviceId, userId)
    );

    CREATE TABLE IF NOT EXISTS service_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serviceId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(serviceId, userId)
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      serviceId TEXT NOT NULL,
      requesterId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',               -- pending|accepted|declined|completed|cancelled
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_svc_provider ON services(providerId);
    CREATE INDEX IF NOT EXISTS idx_svc_kind ON services(kind);
    CREATE INDEX IF NOT EXISTS idx_svc_category ON services(category);
    CREATE INDEX IF NOT EXISTS idx_svc_campus ON services(campus);
    CREATE INDEX IF NOT EXISTS idx_svc_created ON services(createdAt);
    CREATE INDEX IF NOT EXISTS idx_svc_reviews_service ON service_reviews(serviceId);
    CREATE INDEX IF NOT EXISTS idx_svc_saves_user ON service_saves(userId);
    CREATE INDEX IF NOT EXISTS idx_svc_req_provider ON service_requests(providerId);
    CREATE INDEX IF NOT EXISTS idx_svc_req_requester ON service_requests(requesterId);

    -- ── VYBE Planner (academic productivity) ──────────────────────
    CREATE TABLE IF NOT EXISTS planner_semesters (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      startDate TEXT DEFAULT '',
      endDate TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_modules (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      semesterId TEXT,
      code TEXT DEFAULT '',
      name TEXT NOT NULL,
      color TEXT DEFAULT '#1A3F75',
      archived INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_topics (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      moduleId TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'not-started',
      priority TEXT DEFAULT 'medium',
      notes TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_tasks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      moduleId TEXT,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'assignment',
      description TEXT DEFAULT '',
      dueDate TEXT DEFAULT '',
      dueTime TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'not-started',
      progress INTEGER DEFAULT 0,
      estimatedHours REAL DEFAULT 0,
      topicIds TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      pinned INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      moduleId TEXT,
      topicId TEXT,
      taskId TEXT,
      planId TEXT,
      title TEXT NOT NULL,
      date TEXT DEFAULT '',
      startTime TEXT DEFAULT '',
      endTime TEXT DEFAULT '',
      durationMin INTEGER DEFAULT 60,
      goal TEXT DEFAULT '',
      status TEXT DEFAULT 'planned',
      actualMin INTEGER DEFAULT 0,
      reflection TEXT DEFAULT '',
      resourceId TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_plans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      moduleId TEXT,
      taskId TEXT,
      goal TEXT DEFAULT '',
      targetDate TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_prefs (
      userId TEXT PRIMARY KEY,
      remindAssignments INTEGER DEFAULT 1,
      remindExams INTEGER DEFAULT 1,
      remindSessions INTEGER DEFAULT 1,
      remindOverdue INTEGER DEFAULT 1,
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pl_mod_user ON planner_modules(userId);
    CREATE INDEX IF NOT EXISTS idx_pl_topic_module ON planner_topics(moduleId);
    CREATE INDEX IF NOT EXISTS idx_pl_task_user ON planner_tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_pl_task_module ON planner_tasks(moduleId);
    CREATE INDEX IF NOT EXISTS idx_pl_task_due ON planner_tasks(dueDate);
    CREATE INDEX IF NOT EXISTS idx_pl_sess_user ON planner_sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_pl_sess_date ON planner_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_pl_sess_task ON planner_sessions(taskId);
  `);

  // Safe additive migrations for databases created before newer columns existed.
  // These only run when the column is missing; errors (already exists) are ignored.
  await ensureColumn(c, 'notifications', 'relatedId', 'TEXT');
  await ensureColumn(c, 'notifications', 'relatedType', 'TEXT');
  // ownerId always stores the real author (even for anonymous posts) so the owner can manage them.
  await ensureColumn(c, 'posts', 'ownerId', 'TEXT');
  // Games can be public (play with anyone) or private (sent to one friend's inbox).
  await ensureColumn(c, 'games', 'visibility', 'TEXT');
  await ensureColumn(c, 'games', 'targetUserId', 'TEXT');
  // Planner tasks can reference an Academy resource (a link, never a content copy).
  await ensureColumn(c, 'planner_tasks', 'resourceId', 'TEXT');
  // Comments can be replies to another comment (threaded).
  await ensureColumn(c, 'comments', 'parentId', 'TEXT');
  // Posts can be edited — track an edit timestamp so we can show an "Edited" indicator.
  await ensureColumn(c, 'posts', 'editedAt', 'TEXT');
  // Reports carry an optional free-text description and a moderation status.
  await ensureColumn(c, 'reports', 'description', 'TEXT');
  await ensureColumn(c, "reports", "status", "TEXT DEFAULT 'pending'");
  // Admin role flag on users (server-side authorization for the admin area).
  await ensureColumn(c, 'users', 'isAdmin', 'INTEGER DEFAULT 0');
  // Per-user privacy preferences, stored as a JSON blob.
  await ensureColumn(c, 'users', 'privacySettings', 'TEXT');
}

async function ensureColumn(c: Client, table: string, column: string, type: string) {
  try {
    const info = await c.execute(`PRAGMA table_info(${table})`);
    const has = info.rows.some((row: any) => {
      const name = (row as any).name ?? row[1];
      return name === column;
    });
    if (!has) {
      await c.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch {
    // Ignore — column likely already exists or table not yet created
  }
}
