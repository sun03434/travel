import { Guide } from '@/types/place';

const KEY = 'travel_guide_history';
const MAX_ITEMS = 20;

export function saveGuide(guide: Guide): void {
  if (typeof window === 'undefined') return;
  const history = loadHistory();
  const updated = [guide, ...history.filter((g) => g.id !== guide.id)].slice(0, MAX_ITEMS);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function loadHistory(): Guide[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function deleteGuide(id: string): void {
  if (typeof window === 'undefined') return;
  const history = loadHistory().filter((g) => g.id !== id);
  localStorage.setItem(KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
