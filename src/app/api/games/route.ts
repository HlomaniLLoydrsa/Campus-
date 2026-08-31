import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/games
export async function GET() {
  const db = await getDb();
  const games = await db.prepare('SELECT * FROM games ORDER BY createdAt DESC').all();
  return NextResponse.json(games.map((g: any) => ({
    ...g,
    participants: JSON.parse(g.participants || '[]'),
    data: JSON.parse(g.data || '{}'),
  })));
}

// POST /api/games — create a new game
export async function POST(request: Request) {
  const body = await request.json();
  const { type, creatorId, title, data } = body;

  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 });
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

  await db.prepare('INSERT INTO games (id, type, creatorId, title, status, participants, data) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, type, creatorId, title.trim(), 'active', JSON.stringify([creatorId]), JSON.stringify(normalizedData)
  );

  return NextResponse.json({ id, type, creatorId, title: title.trim(), status: 'active', participants: [creatorId], data: normalizedData, createdAt: new Date().toISOString() }, { status: 201 });
}

// PATCH /api/games — vote/guess
export async function PATCH(request: Request) {
  const body = await request.json();
  const { gameId, action, userId, option, statementIndex, response, guessIndex } = body;
  const db = await getDb();

  const game = await db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const data = JSON.parse(game.data);
  // Auto-join the player as a participant when they interact
  let participants: string[] = JSON.parse(game.participants || '[]');
  if (userId && !participants.includes(userId)) {
    participants = [...participants, userId];
    await db.prepare('UPDATE games SET participants = ? WHERE id = ?').run(JSON.stringify(participants), gameId);
  }

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
  return NextResponse.json({ success: true, data });
}
