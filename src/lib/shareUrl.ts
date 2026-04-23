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
  // blogContext는 크기가 크고 공유에 불필요하므로 제외
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { blogContext: _bc, ...shareableGuide } = guide;
  return `${window.location.origin}/guide/shared?data=${encodeGuide(shareableGuide as Guide)}`;
}
