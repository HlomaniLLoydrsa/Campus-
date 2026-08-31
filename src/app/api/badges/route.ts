import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  posts: number;
  confessions: number;
  questions: number;
  shoutouts: number;
  events: number;
  connections: number;
  gamesCreated: number;
  gamesPlayed: number;
  storiesPosted: number;
  wingmanSuggestions: number;
  isEarlyMember: boolean;
  trendingPost: boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  { id: 'early-member', name: 'Early Member', emoji: '⭐', description: 'One of the first to join Campus', check: s => s.isEarlyMember },
  { id: 'social-butterfly', name: 'Social Butterfly', emoji: '🦋', description: 'Connected with 5+ people', check: s => s.connections >= 5 },
  { id: 'wingman', name: 'Wingman', emoji: '🏹', description: 'Made a wingman suggestion', check: s => s.wingmanSuggestions >= 1 },
  { id: 'gamer', name: 'Gamer', emoji: '🎮', description: 'Played 3+ social games', check: s => s.gamesPlayed >= 3 },
  { id: 'party-starter', name: 'Party Starter', emoji: '🎉', description: 'Created 2+ events', check: s => s.events >= 2 },
  { id: 'study-machine', name: 'Study Machine', emoji: '📚', description: 'Asked 3+ questions', check: s => s.questions >= 3 },
  { id: 'smart-one', name: 'Smart One', emoji: '🧠', description: 'Created a game', check: s => s.gamesCreated >= 1 },
  { id: 'helper', name: 'Helper', emoji: '🤝', description: 'Made 3+ connections', check: s => s.connections >= 3 },
  { id: 'trending', name: 'Trending', emoji: '🔥', description: 'Had a post go trending', check: s => s.trendingPost },
  { id: 'conversation-starter', name: 'Conversation Starter', emoji: '💬', description: 'Posted 5+ times', check: s => s.posts >= 5 },
  { id: 'shoutout-king', name: 'Shoutout King/Queen', emoji: '🎤', description: 'Gave 2+ shoutouts', check: s => s.shoutouts >= 2 },
  { id: 'event-host', name: 'Event Host', emoji: '🏆', description: 'Hosted an event', check: s => s.events >= 1 },
  { id: 'explorer', name: 'Explorer', emoji: '👀', description: 'Posted a story', check: s => s.storiesPosted >= 1 },
  { id: 'popular', name: 'Popular', emoji: '🌟', description: 'Connected with 10+ people', check: s => s.connections >= 10 },
];

async function computeStats(db: any, userId: string): Promise<Stats> {
  const userRow = await db.prepare('SELECT createdAt FROM users WHERE id = ?').get(userId) as any;
  const allPosts = await db.prepare('SELECT * FROM posts WHERE authorId = ?').all(userId) as any[];
  const posts = allPosts.length;
  const confessions = allPosts.filter(p => p.type === 'confession').length;
  const questions = allPosts.filter(p => p.type === 'question').length;
  const shoutouts = allPosts.filter(p => p.type === 'shoutout').length;
  const events = allPosts.filter(p => p.type === 'event' || p.eventData).length;
  const trendingPost = allPosts.some(p => (p.likes || 0) >= 10);

  const connections = (await db.prepare('SELECT COUNT(*) as c FROM connections WHERE userId = ?').get(userId) as any).c;
  const gamesCreated = (await db.prepare('SELECT COUNT(*) as c FROM games WHERE creatorId = ?').get(userId) as any).c;
  const allGames = await db.prepare('SELECT participants FROM games').all() as any[];
  const gamesPlayed = allGames.filter(g => { try { return JSON.parse(g.participants || '[]').includes(userId); } catch { return false; } }).length;
  const now = new Date().toISOString();
  const storiesPosted = (await db.prepare('SELECT COUNT(*) as c FROM stories WHERE userId = ? AND expiresAt > ?').get(userId, now) as any).c;
  const wingmanSuggestions = (await db.prepare('SELECT COUNT(*) as c FROM wingman_suggestions WHERE wingmanId = ?').get(userId) as any).c;

  // Early member: among the first 20 users
  const rank = (await db.prepare('SELECT COUNT(*) as c FROM users WHERE createdAt <= ?').get(userRow?.createdAt || now) as any).c;
  const isEarlyMember = rank <= 20;

  return { posts, confessions, questions, shoutouts, events, connections, gamesCreated, gamesPlayed, storiesPosted, wingmanSuggestions, isEarlyMember, trendingPost };
}

// GET /api/badges?userId=xxx — compute + persist earned badges, return the full list with earned flag
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = await getDb();

  try {
  const stats = await computeStats(db, userId);

  const earnedRows = await db.prepare('SELECT badgeId, earnedAt FROM badges WHERE userId = ?').all(userId) as any[];
  const earnedMap = new Map(earnedRows.map(r => [r.badgeId, r.earnedAt]));

  // Confirm the user actually exists before writing any FK-bound rows
  const userExists = await db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);

  const result = [];
  for (const def of BADGE_DEFS) {
    const qualifies = def.check(stats);
    let earnedAt = earnedMap.get(def.id);
    // Newly earned → persist (only if the user row exists)
    if (qualifies && !earnedAt && userExists) {
      earnedAt = new Date().toISOString();
      try {
        await db.prepare('INSERT OR IGNORE INTO badges (userId, badgeId, earnedAt) VALUES (?, ?, ?)').run(userId, def.id, earnedAt);
        // Notify user of new badge — wrapped so a notification failure never breaks the endpoint
        const nid = `n_${Date.now()}_${def.id}`;
        await db.prepare('INSERT OR IGNORE INTO notifications (id, userId, type, message, read) VALUES (?, ?, ?, ?, 0)').run(nid, userId, 'new-connection', `You earned the ${def.emoji} ${def.name} badge!`);
      } catch {
        // ignore — badge display still works from computed `qualifies`
      }
    }
    result.push({ id: def.id, name: def.name, emoji: def.emoji, description: def.description, earned: qualifies || !!earnedMap.get(def.id), earnedAt: earnedAt || null });
  }

  return NextResponse.json({ badges: result, stats });
  } catch (e) {
    // Never let badges crash the app — return the full list as unearned
    const fallback = BADGE_DEFS.map(def => ({ id: def.id, name: def.name, emoji: def.emoji, description: def.description, earned: false, earnedAt: null }));
    return NextResponse.json({ badges: fallback, stats: {} });
  }
}
