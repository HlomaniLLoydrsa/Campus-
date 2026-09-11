import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/games
export async function GET() {
  const db = await getDb();
  // Only public "play with anyone" games appear in the shared list, newest first.
  // Private (friend) games live only in the inbox conversation.
  const games = await db.prepare("SELECT * FROM games WHERE visibility IS NULL OR visibility = 'public' ORDER BY createdAt DESC").all();
  return NextResponse.json(games.map((g: any) => ({
    ...g,
    participants: JSON.parse(g.participants || '[]'),
    data: JSON.parse(g.data || '{}'),
  })));
}

// POST /api/games — create a new game (creator = authenticated user)
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const creatorId = auth;

  const body = await request.json();
  const { type, title, data } = body;
  // visibility: 'public' (play with anyone) or 'private' (sent to one friend's inbox)
  const visibility = body.visibility === 'private' ? 'private' : 'public';
  const targetUserId = visibility === 'private' ? (body.targetUserId || null) : null;

  if (!type || !['would-you-rather', 'never-have-i-ever', 'two-truths-one-lie'].includes(type)) {
    return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
  }
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  // Validate game data by type
  if (type === 'would-you-rather') {
    if (!data?.optionA?.trim() || !data?.optionB?.trim()) return NextResponse.json({ error: 'Both options are required' }, { status: 400 });
  } else if (type === 'two-truths-one-lie') {
    if (!Array.isArray(data?.statements) || data.statements.length !== 3) return NextResponse.json({ error: 'Exactly 3 statements required' }, { status: 400 });
    if (!data.statements.some((s: any) => s.isLie)) return NextResponse.json({ error: 'You must mark one statement as the lie' }, { status: 400 });
  } else if (type === 'never-have-i-ever') {
    if (!Array.isArray(data?.statements) || data.statements.length === 0) return NextResponse.json({ error: 'At least one statement required' }, { status: 400 });
  }

  const db = await getDb();
  const id = `g_${crypto.randomUUID().slice(0, 8)}`;

  // Normalize data with empty vote arrays
  let normalizedData: any = {};
  if (type === 'would-you-rather') {
    normalizedData = { optionA: data.optionA.trim(), optionB: data.optionB.trim(), votesA: [], votesB: [] };
  } else if (type === 'never-have-i-ever') {
    normalizedData = { statements: data.statements.map((s: any) => ({ text: (s.text || '').trim(), iHave: [], iHaveNot: [] })) };
  } else if (type === 'two-truths-one-lie') {
    normalizedData = { statements: data.statements.map((s: any) => ({ text: (s.text || '').trim(), isLie: !!s.isLie })), guesses: [], revealed: false };
  }

  await db.prepare('INSERT INTO games (id, type, creatorId, title, status, participants, data, visibility, targetUserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, type, creatorId, title.trim(), 'active', JSON.stringify([creatorId]), JSON.stringify(normalizedData), visibility, targetUserId
  );

  // Private game → deliver it to the friend's inbox as a clickable message.
  if (visibility === 'private' && targetUserId) {
    const creator = await db.prepare('SELECT name FROM users WHERE id = ?').get(creatorId) as any;
    const gameLabel = type === 'would-you-rather' ? 'Would You Rather' : type === 'never-have-i-ever' ? 'Never Have I Ever' : 'Two Truths, One Lie';

    // Find or create the direct conversation between the two users.
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => {
      const parts = JSON.parse(c.participants || '[]');
      return parts.includes(creatorId) && parts.includes(targetUserId);
    });
    let convId: string;
    if (conv) {
      convId = conv.id;
    } else {
      convId = `conv_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([creatorId, targetUserId]));
    }
    const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
    const content = `[game:${id}] 🎮 ${creator?.name || 'Someone'} wants to play ${gameLabel} with you: "${title.trim()}"`;
    await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, creatorId, content, new Date().toISOString());

    // Notify the friend
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, targetUserId, 'game-invitation', creatorId, `${creator?.name || 'Someone'} wants to play ${gameLabel} with you`, convId, 'conversation');
  }

  return NextResponse.json({ id, type, creatorId, title: title.trim(), status: 'active', participants: [creatorId], data: normalizedData, visibility, targetUserId, createdAt: new Date().toISOString() }, { status: 201 });
}

// DELETE /api/games?gameId=xxx — creator deletes their own game
export async function DELETE(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });

  const db = await getDb();
  const game = await db.prepare('SELECT creatorId FROM games WHERE id = ?').get(gameId) as any;
  if (!game) return NextResponse.json({ success: true });
  if (game.creatorId !== userId) return NextResponse.json({ error: 'Only the creator can delete this game' }, { status: 403 });
  await db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
  return NextResponse.json({ success: true });
}

// PATCH /api/games — vote/guess as the authenticated user
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { gameId, action, option, statementIndex, response, guessIndex } = body;
  const db = await getDb();

  const game = await db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const data = JSON.parse(game.data);
  // Auto-join the player as a participant when they interact
  let participants: string[] = JSON.parse(game.participants || '[]');
  const wasParticipant = participants.includes(userId);
  if (userId && !wasParticipant) {
    participants = [...participants, userId];
    await db.prepare('UPDATE games SET participants = ? WHERE id = ?').run(JSON.stringify(participants), gameId);
  }

  // Notify the creator the first time someone submits an answer to their game.
  // Deterministic id per (game, responder) so re-voting never spams the creator.
  const notifyCreatorOfAnswer = async () => {
    if (!game.creatorId || game.creatorId === userId) return;
    const answerActions = ['voteWouldYouRather', 'voteNeverHaveIEver', 'guessTwoTruths'];
    if (!answerActions.includes(action)) return;
    const responder = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const nid = `ngm_${gameId}_${userId}`;
    await db.prepare('INSERT OR IGNORE INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      nid, game.creatorId, 'game-answer', userId, `${responder?.name || 'Someone'} answered your game "${game.title}"`, gameId, 'game'
    );
  };

  if (action === 'voteWouldYouRather') {
    data.votesA = (data.votesA || []).filter((id: string) => id !== userId);
    data.votesB = (data.votesB || []).filter((id: string) => id !== userId);
    if (option === 'A') data.votesA.push(userId);
    else data.votesB.push(userId);
  }

  if (action === 'voteNeverHaveIEver') {
    const stmt = data.statements[statementIndex];
    if (stmt) {
      stmt.iHave = (stmt.iHave || []).filter((id: string) => id !== userId);
      stmt.iHaveNot = (stmt.iHaveNot || []).filter((id: string) => id !== userId);
      if (response === 'iHave') stmt.iHave.push(userId);
      else stmt.iHaveNot.push(userId);
    }
  }

  if (action === 'guessTwoTruths') {
    if (!data.guesses) data.guesses = [];
    if (!data.guesses.find((g: any) => g.userId === userId)) {
      data.guesses.push({ userId, guessIndex });
    }
  }

  if (action === 'revealTwoTruths') {
    if (game.creatorId === userId) {
      data.revealed = true;
    }
  }

  await db.prepare('UPDATE games SET data = ? WHERE id = ?').run(JSON.stringify(data), gameId);
  await notifyCreatorOfAnswer();
  return NextResponse.json({ success: true, data });
}
