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

    // Games → Explore
    case 'game-invitation':
      return '/explore';

    // Badges, wingman, secret-admirer, and anything else → stay on the notifications page.
    case 'badge':
    case 'wingman-activity':
    case 'secret-admirer':
    default:
      return '/notifications';
  }
}
