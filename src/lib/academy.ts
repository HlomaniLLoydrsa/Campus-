// Shared VYBE Academy types + constants (client + server safe).

export interface AcademyResource {
  id: string;
  uploaderId: string;
  title: string;
  type: string;
  institution: string;
  faculty: string;
  course: string;
  module: string;
  year: string;
  semester: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  downloads: number;
  createdAt: string;
  ratingCount?: number;
  ratingAvg?: number;
  saved?: boolean;
  myRating?: number;
}

export const RESOURCE_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'past-paper', label: 'Past Paper', emoji: '📄' },
  { value: 'test', label: 'Test', emoji: '📝' },
  { value: 'assignment', label: 'Assignment', emoji: '📋' },
  { value: 'notes', label: 'Notes', emoji: '📒' },
  { value: 'summary', label: 'Summary', emoji: '🗒️' },
  { value: 'study-guide', label: 'Study Guide', emoji: '📚' },
  { value: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { value: 'tutorial', label: 'Tutorial', emoji: '🎥' },
  { value: 'other', label: 'Other', emoji: '📎' },
];

export function typeMeta(value: string) {
  return RESOURCE_TYPES.find(t => t.value === value) || RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
