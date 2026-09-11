/**
 * Parse a date string robustly. SQLite `datetime('now')` returns UTC like
 * "2026-08-26 09:00:00" with NO timezone marker — JS would treat that as LOCAL
 * time, throwing "X ago" off by the timezone offset. Normalize such strings to UTC.
 */
export function parseDate(input: string): Date | null {
  if (!input) return null;
  let s = String(input).trim();
  // "YYYY-MM-DD HH:MM:SS" (space, no T, no Z) → treat as UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatTimeAgo(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return 'just now';
  const now = new Date();
  let seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // Clock skew / just-created rows can read slightly in the future → treat as now.
  if (seconds < 0) seconds = 0;

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    party: 'bg-pink-100 text-pink-700',
    clubbing: 'bg-purple-100 text-purple-700',
    movies: 'bg-blue-100 text-blue-700',
    sports: 'bg-green-100 text-green-700',
    gaming: 'bg-indigo-100 text-indigo-700',
    study: 'bg-yellow-100 text-yellow-700',
    hangout: 'bg-orange-100 text-orange-700',
    roadtrip: 'bg-teal-100 text-teal-700',
    campus: 'bg-cyan-100 text-cyan-700',
    other: 'bg-gray-100 text-gray-700',
  };
  return colors[category] || colors.other;
}

export function getPostTypeStyle(type: string): { bg: string; text: string; label: string } {
  switch (type) {
    case 'confession': return { bg: 'bg-purple-100', text: 'text-purple-700', label: '🤫 Confession' };
    case 'question': return { bg: 'bg-blue-100', text: 'text-blue-700', label: '❓ Question' };
    case 'shoutout': return { bg: 'bg-orange-100', text: 'text-orange-700', label: '📢 Shoutout' };
    case 'event': return { bg: 'bg-green-100', text: 'text-green-700', label: '🎉 Event' };
    case 'i-saw-you': return { bg: 'bg-pink-100', text: 'text-pink-700', label: '👀 I Saw You' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: '' };
  }
}
