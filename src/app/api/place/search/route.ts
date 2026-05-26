import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const NAVER_API = 'https://openapi.naver.com/v1/search/local.json';

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('query');
  const regionName = searchParams.get('regionName') ?? '';

  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  // 지역명을 쿼리에 결합해서 지역 기반 검색 효과
  const fullQuery = regionName ? `${regionName} ${query}` : query;

  const params = new URLSearchParams({
    query: fullQuery,
    display: '10',
    sort: 'random',
  });

  const res = await fetch(`${NAVER_API}?${params}`, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID ?? '',
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET ?? '',
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: '네이버 검색 API 오류' }, { status: res.status });
  }

  const data = await res.json();

  // 네이버 로컬 결과를 KakaoPlace 형태로 변환
  const places = (data.items ?? []).map((item: {
    title: string;
    link: string;
    category: string;
    telephone: string;
    address: string;
    roadAddress: string;
    mapx: string;
    mapy: string;
  }, idx: number) => ({
    id: `naver_${idx}_${Date.now()}`,
    place_name: stripHtml(item.title),
    category_name: item.category,
    address_name: item.address,
    road_address_name: item.roadAddress,
    // 네이버 좌표는 WGS84 * 10^7 → 변환
    x: String(parseInt(item.mapx) / 10_000_000),
    y: String(parseInt(item.mapy) / 10_000_000),
    phone: item.telephone,
    place_url: item.link || `https://map.naver.com/v5/search/${encodeURIComponent(stripHtml(item.title))}`,
  }));

  return NextResponse.json({ places, isEnd: true, totalCount: places.length });
}
