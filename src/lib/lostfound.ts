// Shared VYBE Lost & Found types + constants (client + server safe).

export interface LostFoundItem {
  id: string;
  reporterId: string;
  kind: 'lost' | 'found';
  itemName: string;
  category: string;
  description: string;
  photo?: string | null;
  location: string;
  campus: string;
  dateOn: string;
  status: 'open' | 'recovered';
  createdAt: string;
}

export interface LostFoundClaim {
  id: string;
  itemId: string;
  claimantId: string;
  answer: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const LF_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'electronics', label: 'Electronics', emoji: '🔌' },
  { value: 'phone', label: 'Phone', emoji: '📱' },
  { value: 'laptop', label: 'Laptop', emoji: '💻' },
  { value: 'wallet', label: 'Wallet', emoji: '👛' },
  { value: 'keys', label: 'Keys', emoji: '🔑' },
  { value: 'student-card', label: 'Student Card', emoji: '🪪' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'bag', label: 'Bag', emoji: '🎒' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'calculator', label: 'Calculator', emoji: '🧮' },
  { value: 'jewellery', label: 'Jewellery', emoji: '💍' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export function lfCategoryMeta(value: string) {
  return LF_CATEGORIES.find(c => c.value === value) || LF_CATEGORIES[LF_CATEGORIES.length - 1];
}
