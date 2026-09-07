import type { Notification } from '@/types';

/**
 * Maps a notification to the route it should navigate to when clicked.
 * Uses relatedType/relatedId set by the backend, with sensible fallbacks by type.
 *
 * Query params are read by the destination pages to focus the right item:
 *   /connections?tab=requests            → open Requests tab
 *   /connections?tab=requests&highlight= → highlight a specific request
 *   /messages?conversation=<id>          → open that conversation
 *   /?post=<id>                          → scroll to / open that post
 *   /explore?game=<id>                   → open that game
 */
export function getNotificationHref(n: Pick<Notification, 'type' | 'relatedId' | 'relatedType'>): string {
  const { type, relatedId, relatedType } = n;

  // Prefer explicit relatedType from backend
  switch (relatedType) {
    case 'request':
      return relatedId
        ? `/connections?tab=requests&highlight=${relatedId}`
        : '/connections?tab=requests';
    case 'connection':
      return '/connections?tab=requests';
    case 'conversation':
      return relatedId ? `/messages?conversation=${relatedId}` : '/messages';
    case 'post':
      return relatedId ? `/?post=${relatedId}` : '/';
    case 'game':
      return relatedId ? `/explore?game=${relatedId}` : '/explore';
  }

  // Fallback by notification type when relatedType is missing (older notifications)
  switch (type) {
    case 'friend-request':
    case 'relationship-request':
    case 'request-cancelled':
      return '/connections?tab=requests';
    case 'friend-accepted':
    case 'relationship-accepted':
    case 'new-connection':
      return '/connections?tab=requests';
    case 'new-message':
    case 'group-message':
    case 'event-message':
      return '/messages';
    case 'like':
    case 'comment':
    case 'reply':
    case 'shoutout':
    case 'question-answer':
    case 'mention':
    case 'event-invitation':
    case 'event-join-request':
    case 'event-approved':
      return '/';
    case 'game-invitation':
      return '/explore';
    case 'wingman-activity':
    case 'secret-admirer':
      return '/notifications';
    default:
      return '/notifications';
  }
}
