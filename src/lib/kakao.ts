import type { KakaoPlace } from '@/types/plan';

export interface KakaoSearchResult {
  places: KakaoPlace[];
  isEnd: boolean;
  totalCount: number;
}

export async function searchKakaoPlaces(
  query: string,
  options: {
    category?: string;
    x?: number;
    y?: number;
    radius?: number;
    page?: number;
  } = {}
): Promise<KakaoSearchResult> {
  const params = new URLSearchParams({
    query,
    size: '10',
    page: String(options.page ?? 1),
  });

  if (options.x != null) params.set('x', String(options.x));
  if (options.y != null) params.set('y', String(options.y));
  if (options.radius != null) params.set('radius', String(options.radius));
  if (options.category) params.set('category_group_code', options.category);

  const res = await fetch(`/api/place/search?${params.toString()}`);
  if (!res.ok) throw new Error('장소 검색에 실패했습니다.');
  return res.json();
}

export function kakaoPlaceToWishPlace(
  place: KakaoPlace,
  category: 'attraction' | 'restaurant' | 'cafe' | 'shopping'
) {
  return {
    kakaoId: place.id,
    name: place.place_name,
    category,
    address: place.address_name,
    roadAddress: place.road_address_name,
    lat: parseFloat(place.y),
    lng: parseFloat(place.x),
    phone: place.phone || undefined,
    kakaoMapUrl: place.place_url,
  };
}
