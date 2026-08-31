export type PostType = 'normal' | 'confession' | 'question' | 'shoutout' | 'event' | 'i-saw-you';

export type RequestType = 'friend' | 'relationship';

export type ConnectionStatus =
  | 'none'
  | 'friend-pending-sent'
  | 'friend-pending-received'
  | 'relationship-pending-sent'
  | 'relationship-pending-received'
  | 'friends'
  | 'relationship';

export type EventCategory = 'party' | 'clubbing' | 'movies' | 'sports' | 'gaming' | 'study' | 'hangout' | 'roadtrip' | 'campus' | 'other';

export type GameType = 'would-you-rather' | 'never-have-i-ever' | 'two-truths-one-lie';

export type NotificationType =
  | 'friend-request'
  | 'relationship-request'
  | 'friend-accepted'
  | 'relationship-accepted'
  | 'request-cancelled'
  | 'new-message'
  | 'group-message'
  | 'event-invitation'
  | 'event-join-request'
  | 'event-approved'
  | 'event-message'
  | 'like'
  | 'comment'
  | 'reply'
  | 'shoutout'
  | 'question-answer'
  | 'wingman-activity'
  | 'secret-admirer'
  | 'game-invitation'
  | 'mention'
  | 'new-connection';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  course: string;
  faculty: string;
  yearOfStudy: number;
  interests: string[];
  hobbies: string[];
  socialLinks?: { platform: string; url: string }[];
  connectionsCount: number;
  postsCount: number;
  badges: Badge[];
  joinedAt: string;
  isOnline: boolean;
  lastSeen?: string;
  privacySettings: PrivacySettings;
  wingmanEnabled: boolean;
  wingmen: string[];
}

export interface PrivacySettings {
  showProfile: 'everyone' | 'connections' | 'nobody';
  showInterests: 'everyone' | 'connections' | 'nobody';
  allowRequests: 'everyone' | 'connections-of-connections' | 'nobody';
  allowMessages: 'connections-only';
  showOnlineStatus: boolean;
  showRelationship: boolean;
}

export interface Post {
  id: string;
  type: PostType;
  authorId: string | null;
  author?: User;
  isAnonymous: boolean;
  content: string;
  images?: string[];
  likes: number;
  likedBy: string[];
  comments: Comment[];
  shares: number;
  savedBy: string[];
  reports: number;
  createdAt: string;
  updatedAt?: string;
  eventData?: EventData;
  taggedUserId?: string;
  answers?: Answer[];
  iSawYouData?: ISawYouData;
}

export interface Comment {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
  replies?: Comment[];
}

export interface Answer {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
  isAccepted: boolean;
}

export interface EventData {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  neededCount?: number;
  category: EventCategory;
  image?: string;
  isCreatorAnonymous: boolean;
  joinType: 'direct' | 'approval';
  participants: string[];
  pendingRequests: string[];
  chatId?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
}

export interface ISawYouData {
  location: string;
  description: string;
  respondents: string[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  image?: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'event';
  participants: string[];
  name?: string;
  image?: string;
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
  createdAt: string;
  eventId?: string;
  adminIds?: string[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  fromUserId?: string;
  fromUser?: User;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  groupCount?: number;
  requestType?: RequestType;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt?: string;
}

export interface Game {
  id: string;
  type: GameType;
  creatorId: string;
  creator?: User;
  title: string;
  status: 'active' | 'ended';
  participants: string[];
  createdAt: string;
  data: WouldYouRatherData | NeverHaveIEverData | TwoTruthsOneLieData;
}

export interface WouldYouRatherData {
  optionA: string;
  optionB: string;
  votesA: string[];
  votesB: string[];
}

export interface NeverHaveIEverData {
  statements: { text: string; iHave: string[]; iHaveNot: string[] }[];
}

export interface TwoTruthsOneLieData {
  statements: { text: string; isLie: boolean }[];
  guesses: { userId: string; guessIndex: number }[];
  revealed: boolean;
}

export interface SecretAdmirer {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'pending' | 'curious' | 'revealed' | 'ignored' | 'blocked';
  createdAt: string;
  revealConsent: { from: boolean; to: boolean };
}

export interface WingmanSuggestion {
  id: string;
  wingmanId: string;
  forUserId: string;
  suggestedUserId: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: RequestType;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  content?: string;
  image?: string;
  backgroundColor: string;
  createdAt: string;
  expiresAt: string;
  views: string[];
}
