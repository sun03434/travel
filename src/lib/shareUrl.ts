import { Guide } from '@/types/place';

export function encodeGuide(guide: Guide): string {
  return btoa(encodeURIComponent(JSON.stringify(guide)));
}

export function decodeGuide(encoded: string): Guide | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Guide;
  } catch {
    return null;
  }
}

export function buildShareUrl(guide: Guide): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/guide/shared?data=${encodeGuide(guide)}`;
}
