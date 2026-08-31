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
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'normal',
      authorId TEXT,
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
  `);
}
