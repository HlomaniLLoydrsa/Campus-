// VYBE Assistant — an in-app AI chat buddy for students.
//
// Uses Google Gemini's HTTP API (free tier) when GEMINI_API_KEY is set — no SDK,
// no extra npm dependency. If no key is configured (or the API call fails), we fall
// back to a free, rule-based helper that answers from the user's own app context.
// This means the assistant is always useful, at zero cost, even with no setup.
//
// Env vars:
//   GEMINI_API_KEY — your Google AI Studio key (free tier). Get one at
//                    https://aistudio.google.com/apikey (no credit card for free tier).
//   GEMINI_MODEL   — optional model override. Defaults to 'gemini-2.5-flash'.
//                    (Model names change over time; override here if Google retires one.)

export interface AssistantContext {
  name: string;
  course?: string;
  university?: string;
  unreadMessages: number;
  pendingRequests: number;
  unreadNotifications: number;
  upcomingEvents: { name: string; when?: string }[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResult {
  reply: string;
  source: 'ai' | 'fallback';
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

// The features the assistant knows how to point people to.
const FEATURES: { label: string; path: string; blurb: string }[] = [
  { label: 'Vybe Map', path: '/map', blurb: 'see which friends are around campus right now' },
  { label: 'Explore', path: '/explore', blurb: 'games, trending posts, and campus discovery' },
  { label: 'Events', path: '/events', blurb: 'find and create campus events' },
  { label: 'Messages', path: '/messages', blurb: 'chat with friends and groups' },
  { label: 'Connections', path: '/connections', blurb: 'send friend or relationship requests' },
  { label: 'Secret Admirer', path: '/secret-admirer', blurb: 'send anonymous appreciation' },
  { label: 'I Saw You', path: '/i-saw-you', blurb: 'send a note to a missed connection' },
  { label: 'Wingman', path: '/wingman', blurb: 'let friends help you connect' },
  { label: 'Academy', path: '/academy', blurb: 'share and find study resources' },
  { label: 'Planner', path: '/planner', blurb: 'organise modules, tasks, and study sessions' },
];

export function isAssistantAiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function systemPrompt(ctx: AssistantContext): string {
  const events = ctx.upcomingEvents.length
    ? ctx.upcomingEvents.map(e => `- ${e.name}${e.when ? ` (${e.when})` : ''}`).join('\n')
    : '- (none)';
  const featureList = FEATURES.map(f => `- ${f.label} (${f.path}): ${f.blurb}`).join('\n');
  return [
    "You are Vybe Assistant, a friendly, upbeat helper inside VYBE — a social app for university students in South Africa.",
    "Keep replies short, warm, and practical (2-4 sentences, casual campus tone). Never invent features that don't exist.",
    "When a feature is relevant, mention it by name and its path so the student can find it.",
    "You can help with: navigating the app, drafting posts/messages, study tips, planning their week, and general chat.",
    "Do NOT give medical, legal, or financial advice — point them to a professional instead.",
    "",
    "Here is what you know about the student and their account right now:",
    `- Name: ${ctx.name || 'a student'}`,
    ctx.course ? `- Course: ${ctx.course}` : '',
    ctx.university ? `- University: ${ctx.university}` : '',
    `- Unread messages: ${ctx.unreadMessages}`,
    `- Pending connection requests: ${ctx.pendingRequests}`,
    `- Unread notifications: ${ctx.unreadNotifications}`,
    "- Upcoming events they've joined or created:",
    events,
    "",
    "VYBE features you can point them to:",
    featureList,
  ].filter(Boolean).join('\n');
}

// ── Gemini call ───────────────────────────────────────────────────
async function callGemini(ctx: AssistantContext, history: ChatTurn[], message: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build the conversation. Gemini uses roles 'user' and 'model'.
  const contents = [
    ...history.slice(-8).map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(ctx) }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Gemini call failed:', res.status, detail.slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('').trim();
    return text || null;
  } catch (err) {
    console.error('Gemini call error:', err);
    return null;
  }
}

// ── Rule-based fallback ───────────────────────────────────────────
// Answers common intents from the user's own app context. Always free, always works.
function fallbackReply(ctx: AssistantContext, message: string): string {
  const q = message.toLowerCase().trim();
  const name = (ctx.name || '').split(' ')[0] || 'there';

  const has = (...words: string[]) => words.some(w => q.includes(w));

  // Greetings
  if (has('hi', 'hey', 'hello', 'yo', 'howzit', 'sup') && q.length < 20) {
    return `Hey ${name}! 👋 I'm your Vybe Assistant. I can help you get around the app, catch up on what you've missed, or just chat. Try asking "what did I miss?" or "what can I do here?"`;
  }

  // Meet people / lonely / friends — checked BEFORE catch-up so "meet new people"
  // isn't hijacked by the word "new".
  if (has('friend', 'meet', 'lonely', 'connect', 'crush', 'relationship', 'someone to talk')) {
    return `Want to meet people? A few ways on VYBE: check who's around on the Vybe Map (/map), browse People in Explore (/explore), send a Secret Admirer note (/secret-admirer), or drop an "I Saw You" (/i-saw-you). Wingman (/wingman) lets friends set you up too. 💫`;
  }

  // Catch-up / status
  if (has('miss', 'catch up', 'update', 'notification', 'unread', 'anything new', "what's new")) {
    const bits: string[] = [];
    if (ctx.unreadMessages > 0) bits.push(`${ctx.unreadMessages} unread message${ctx.unreadMessages === 1 ? '' : 's'} (/messages)`);
    if (ctx.pendingRequests > 0) bits.push(`${ctx.pendingRequests} connection request${ctx.pendingRequests === 1 ? '' : 's'} (/connections)`);
    if (ctx.unreadNotifications > 0) bits.push(`${ctx.unreadNotifications} new notification${ctx.unreadNotifications === 1 ? '' : 's'}`);
    if (ctx.upcomingEvents.length > 0) bits.push(`${ctx.upcomingEvents.length} upcoming event${ctx.upcomingEvents.length === 1 ? '' : 's'} (/events)`);
    if (bits.length === 0) return `You're all caught up, ${name}! 🎉 Nothing unread. Maybe check who's around on the Vybe Map (/map) or start a game in Explore (/explore).`;
    return `Here's what's waiting for you, ${name}: ${bits.join(', ')}.`;
  }

  // Events
  if (has('event', 'happening', 'party', 'weekend', 'tonight')) {
    if (ctx.upcomingEvents.length === 0) return `No upcoming events on your list right now. Head to Events (/events) to find or create one — it's a great way to meet people on campus.`;
    const list = ctx.upcomingEvents.slice(0, 3).map(e => `• ${e.name}${e.when ? ` — ${e.when}` : ''}`).join('\n');
    return `You've got these coming up:\n${list}\nSee them all at /events.`;
  }

  // Study / academic
  if (has('study', 'exam', 'assignment', 'notes', 'course', 'module', 'plan', 'homework', 'test')) {
    return `For anything academic, Academy (/academy) has shared notes and resources, and Planner (/planner) helps you organise modules, tasks, and study sessions. Want me to suggest a simple study plan for the week?`;
  }

  // What can you do / help
  if (has('what can', 'help', 'how do', 'features', 'do here', 'use')) {
    return `I can help you get around VYBE and stay on top of things. Big spots: Vybe Map (/map) for who's around, Explore (/explore) for games and discovery, Events (/events), Messages (/messages), and Connections (/connections). What are you in the mood for?`;
  }

  // Post drafting
  if (has('post', 'write', 'caption', 'say', 'draft')) {
    return `I can help you word a post! Tell me the vibe (funny, hype, chill) and what it's about, and I'll suggest a caption. You can post it from the home feed.`;
  }

  // Default
  return `I hear you, ${name}. I'm best at helping you get around VYBE, catching you up on messages/requests/events, meeting people, or study planning. Try "what did I miss?", "who's around?", or "help me plan my week".`;
}

// ── Public entry point ────────────────────────────────────────────
export async function askAssistant(ctx: AssistantContext, history: ChatTurn[], message: string): Promise<AssistantResult> {
  const ai = await callGemini(ctx, history, message);
  if (ai) return { reply: ai, source: 'ai' };
  return { reply: fallbackReply(ctx, message), source: 'fallback' };
}
