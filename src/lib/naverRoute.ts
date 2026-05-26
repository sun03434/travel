import type { ScheduledSlot } from '@/types/plan';

export function buildNaverRouteUrl(slots: ScheduledSlot[]): string {
  const places = slots
    .filter((s) => s.place && s.type !== 'empty')
    .map((s) => s.place!);

  if (places.length === 0) return 'https://map.naver.com';
  if (places.length === 1) {
    const p = places[0];
    return `https://map.naver.com/v5/search/${encodeURIComponent(p.name)}`;
  }

  // Naver Maps directions URL with waypoints
  // Format: /v5/directions/{slng,slat,sname}/{dlng,dlat,dname}/car
  // Multiple waypoints: origin/wp1/wp2/.../dest/car
  const parts = places.map(
    (p) => `${p.lng},${p.lat},${encodeURIComponent(p.name)}`
  );

  return `https://map.naver.com/v5/directions/${parts.join('/')}/${'car'}`;
}

export function buildNaverSearchUrl(name: string, address?: string): string {
  const query = address ? `${name} ${address}` : name;
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}
