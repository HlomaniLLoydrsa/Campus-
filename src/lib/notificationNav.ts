import type { Notification } from '@/types';

/**
 * Maps a notification to the route it should navigate to when clicked.
 *
 * Rule: ONLY connection-related notifications (friend/relationship requests and
 * accepted requests) go to /connections. Everything else goes to its own place,
 * and anything without a specific destination stays on /notifications.
 */
export function getNotificationHref(
  n: Pick<Notification, 'type' | 'relatedId' | 'relatedType'>
): string {
  const { type, relatedId, relatedType } = n;

  // Prefer explicit relatedType from the backend when present.
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
    case 'resource':
      return relatedId ? `/academy/${relatedId}` : '/academy';
    case 'lostfound':
      return relatedId ? `/lost-found/${relatedId}` : '/lost-found';
    case 'service':
      return relatedId ? `/services/${relatedId}` : '/services';
    case 'planner-task':
      return relatedId ? `/planner/tasks/${relatedId}` : '/planner';
    case 'planner-session':
      return relatedId ? `/planner/study/${relatedId}` : '/planner/calendar';
    case 'planner':
      return '/planner';
    case 'wingman':
      return relatedId ? `/wingman?suggestion=${relatedId}` : '/wingman';
    case 'game':
      return relatedId ? `/games?open=${relatedId}` : '/games';
  }

  // Fall back on the notification type. Only the connection types below reach /connections.
  switch (type) {
    // Connection-related → Connections page
    case 'friend-request':
    case 'relationship-request':
    case 'request-cancelled':
    case 'friend-accepted':
    case 'relationship-accepted':
    case 'new-connection':
      return '/connections?tab=requests';

    // Messages → Messages page
    case 'new-message':
    case 'group-message':
    case 'event-message':
      return '/messages';

    // Feed/content-related → Home feed
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

    // Games → the game (relatedId when available), else Games list
    case 'game-invitation':
    case 'game-answer':
      return relatedId ? `/games?open=${relatedId}` : '/games';

    // Wingman → the Wingman suggestion page
    case 'wingman-activity':
      return relatedId ? `/wingman?suggestion=${relatedId}` : '/wingman';

    // Badges, secret-admirer, and anything else → stay on the notifications page.
    case 'badge':
    case 'secret-admirer':
    default:
      return '/notifications';
  }
}
