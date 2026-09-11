// Shared report reasons (client + server). Keep values stable — the API validates against them.
export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'hate', label: 'Hate or discrimination' },
  { value: 'misinformation', label: 'False or misleading information' },
  { value: 'scam', label: 'Scam or suspicious activity' },
  { value: 'other', label: 'Other' },
];

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find(r => r.value === value)?.label || value || 'Unknown';
}
