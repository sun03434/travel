import type { ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';

function fmtPath(p: WishPlace | WishLodging): string {
  return `${p.lng},${p.lat},${encodeURIComponent(p.name)}`;
}

function fmtVia(p: WishPlace | WishLodging): string {
  // via 쿼리스트링 내부 쉼표는 %2C로 인코딩해야 네이버가 하나의 경유지로 파싱
  return `${p.lng}%2C${p.lat}%2C${encodeURIComponent(p.name)}`;
}

function addrQuery(p: WishPlace | WishLodging): string {
  return encodeURIComponent((p as WishPlace).roadAddress || p.address || p.name);
}

export function buildNaverRouteUrl(slots: ScheduledSlot[]): string {
  const places = slots
    .filter((s) => s.place && s.type !== 'empty')
    .map((s) => s.place!);

  if (places.length === 0) return 'https://map.naver.com';

  if (places.length === 1) {
    return `https://map.naver.com/v5/search/${addrQuery(places[0])}`;
  }

  const start = fmtPath(places[0]);
  const end = fmtPath(places[places.length - 1]);

  if (places.length === 2) {
    return `https://map.naver.com/v5/directions/${start}/${end}/car`;
  }

  const vias = places.slice(1, -1).map(fmtVia).join('|');
  return `https://map.naver.com/v5/directions/${start}/${end}/car?via=${vias}`;
}

export function buildNaverSearchUrl(name: string, address?: string): string {
  const query = address ? `${name} ${address}` : name;
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}
