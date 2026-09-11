// Shared VYBE Marketplace types + constants (client + server safe).

export interface MarketListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  campus: string;
  status: 'available' | 'sold';
  createdAt: string;
  saved?: boolean;
}

export const MKT_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'electronics', label: 'Electronics', emoji: '🔌' },
  { value: 'phone', label: 'Phones', emoji: '📱' },
  { value: 'laptop', label: 'Laptops', emoji: '💻' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'furniture', label: 'Furniture', emoji: '🛋️' },
  { value: 'appliances', label: 'Appliances', emoji: '🔧' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'accessories', label: 'Accessories', emoji: '🎧' },
  { value: 'calculator', label: 'Calculators', emoji: '🧮' },
  { value: 'essentials', label: 'Student Essentials', emoji: '🎒' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'Brand New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'used', label: 'Well Used' },
];

export function mktCategoryMeta(value: string) {
  return MKT_CATEGORIES.find(c => c.value === value) || MKT_CATEGORIES[MKT_CATEGORIES.length - 1];
}

export function conditionLabel(value: string) {
  return CONDITIONS.find(c => c.value === value)?.label || value;
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return 'Free';
  return `R${Number(price).toLocaleString()}`;
}
