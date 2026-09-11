// Shared VYBE Services / Gigs / Tutors types + constants (client + server safe).

export interface ServiceListing {
  id: string;
  providerId: string;
  kind: 'service' | 'tutor';
  name: string;
  description: string;
  category: string;
  rate: string;
  campus: string;
  availability: string;
  subjects: string;
  experience: string;
  portfolio: string[];
  createdAt: string;
  ratingAvg?: number;
  ratingCount?: number;
  requestCount?: number;
  saved?: boolean;
  myReview?: { rating: number; comment: string } | null;
}

export interface ServiceReview {
  id: number;
  serviceId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  requesterId: string;
  providerId: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  createdAt: string;
}

export const SERVICE_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'tutoring', label: 'Tutoring', emoji: '🎓' },
  { value: 'design', label: 'Graphic Design', emoji: '🎨' },
  { value: 'web', label: 'Web Development', emoji: '💻' },
  { value: 'photography', label: 'Photography', emoji: '📷' },
  { value: 'video', label: 'Video Editing', emoji: '🎬' },
  { value: 'beauty', label: 'Hair & Beauty', emoji: '💇' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'repairs', label: 'Repairs', emoji: '🔧' },
  { value: 'printing', label: 'Printing', emoji: '🖨️' },
  { value: 'writing', label: 'Writing & Editing', emoji: '✍️' },
  { value: 'tech', label: 'Tech Support', emoji: '🖥️' },
  { value: 'fitness', label: 'Fitness Coaching', emoji: '💪' },
  { value: 'other', label: 'Other', emoji: '🛠️' },
];

export function serviceCategoryMeta(value: string) {
  return SERVICE_CATEGORIES.find(c => c.value === value) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];
}

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
