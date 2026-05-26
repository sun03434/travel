import type { ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';

function fmt(p: WishPlace | WishLodging): string {
  return `${p.lng},${p.lat},${encodeURIComponent(p.name)}`;
}

export function buildNaverRouteUrl(slots: ScheduledSlot[]): string {
  const places = slots
    .filter((s) => s.place && s.type !== 'empty')
    .map((s) => s.place!);

  if (places.length === 0) return 'https://map.naver.com';

  if (places.length === 1) {
    return `https://map.naver.com/v5/search/${encodeURIComponent(places[0].name)}`;
  }

  // 네이버 지도 경유지 경로 URL 형식:
  // 출발지/목적지/car?via=경유1|경유2
  const start = fmt(places[0]);
  const end = fmt(places[places.length - 1]);

  if (places.length === 2) {
    return `https://map.naver.com/v5/directions/${start}/${end}/car`;
  }

  const vias = places.slice(1, -1).map(fmt).join('|');
  return `https://map.naver.com/v5/directions/${start}/${end}/car?via=${vias}`;
}

export function buildNaverSearchUrl(name: string, address?: string): string {
  const query = address ? `${name} ${address}` : name;
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}
