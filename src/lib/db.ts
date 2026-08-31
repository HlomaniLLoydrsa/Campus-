import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// On Render (and locally) the DB lives in DATA_DIR so it survives restarts/redeploys.
// DATA_DIR points to a mounted persistent disk in production; defaults to the project root locally.
const DATA_DIR = process.env.DATA_DIR || process.cwd();
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* ignore */ }
const DB_PATH = path.join(DATA_DIR, 'campus.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
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
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (connectedUserId) REFERENCES users(id),
      UNIQUE(userId, connectedUserId)
    );

    CREATE TABLE IF NOT EXISTS connection_requests (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'friend',
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (fromUserId) REFERENCES users(id),
      FOREIGN KEY (toUserId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      fromUserId TEXT,
      message TEXT NOT NULL,
      requestType TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
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
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (postId) REFERENCES posts(id),
      FOREIGN KEY (authorId) REFERENCES users(id)
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
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversationId) REFERENCES conversations(id),
      FOREIGN KEY (senderId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      creatorId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      participants TEXT DEFAULT '[]',
      data TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creatorId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      content TEXT,
      image TEXT,
      backgroundColor TEXT DEFAULT '#6C5CE7',
      createdAt TEXT DEFAULT (datetime('now')),
      expiresAt TEXT NOT NULL,
      views TEXT DEFAULT '[]',
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS secret_admirers (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      revealFrom INTEGER DEFAULT 0,
      revealTo INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (fromUserId) REFERENCES users(id),
      FOREIGN KEY (toUserId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS wingman_suggestions (
      id TEXT PRIMARY KEY,
      wingmanId TEXT NOT NULL,
      forUserId TEXT NOT NULL,
      suggestedUserId TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wingmanId) REFERENCES users(id)
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
