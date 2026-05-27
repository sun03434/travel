import type { ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';

function addrQuery(p: WishPlace | WishLodging): string {
  return encodeURIComponent((p as WishPlace).roadAddress || p.address || p.name);
}

/**
 * 네이버지도 앱 스킴(nmap://) URL 반환.
 * 앱이 설치된 모바일에서만 동작하며, 자동차 경로 + 경유지를 지원한다.
 * 앱 미설치 시 브라우저가 실행 실패하므로 DayTimeline에서 앱/웹 분기가 필요하다.
 */
export function buildNaverAppRouteUrl(slots: ScheduledSlot[]): string {
  const places = slots
    .filter((s) => s.place && s.type !== 'empty')
    .map((s) => s.place!);

  if (places.length === 0) return '';

  const start = places[0];
  const end = places[places.length - 1];

  const params = new URLSearchParams({
    slat: String(start.lat),
    slng: String(start.lng),
    sname: start.name,
    dlat: String(end.lat),
    dlng: String(end.lng),
    dname: end.name,
    appname: 'kr.aibang.travel',
  });

  // 경유지 (최대 5개)
  places.slice(1, -1).slice(0, 5).forEach((p, i) => {
    params.set(`v${i + 1}lat`, String(p.lat));
    params.set(`v${i + 1}lng`, String(p.lng));
    params.set(`v${i + 1}name`, p.name);
  });

  return `nmap://route/car?${params.toString()}`;
}

/** 웹 폴백: 출발~도착 2점 자동차 길찾기 (via 없이) */
export function buildNaverWebRouteUrl(slots: ScheduledSlot[]): string {
  const places = slots
    .filter((s) => s.place && s.type !== 'empty')
    .map((s) => s.place!);

  if (places.length === 0) return 'https://map.naver.com';
  if (places.length === 1) {
    return `https://map.naver.com/v5/search/${addrQuery(places[0])}`;
  }

  const s = places[0];
  const e = places[places.length - 1];
  return `https://map.naver.com/v5/directions/${s.lng},${s.lat},${encodeURIComponent(s.name)}/${e.lng},${e.lat},${encodeURIComponent(e.name)}/car`;
}

/** 하위 호환: 기존 naverRouteUrl 필드용 (앱 스킴 우선) */
export function buildNaverRouteUrl(slots: ScheduledSlot[]): string {
  return buildNaverAppRouteUrl(slots) || buildNaverWebRouteUrl(slots);
}

export function buildNaverSearchUrl(name: string, address?: string): string {
  const query = address ? `${name} ${address}` : name;
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}
