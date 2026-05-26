import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const KAKAO_API = 'https://dapi.kakao.com/v2/local/search/keyword.json';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('query');
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const params = new URLSearchParams({ query, size: '10' });

  const x = searchParams.get('x');
  const y = searchParams.get('y');
  const radius = searchParams.get('radius');
  const page = searchParams.get('page');
  const category = searchParams.get('category_group_code');

  if (x) params.set('x', x);
  if (y) params.set('y', y);
  if (radius) params.set('radius', radius);
  if (page) params.set('page', page);
  if (category) params.set('category_group_code', category);

  const res = await fetch(`${KAKAO_API}?${params}`, {
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: '카카오 API 오류' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({
    places: data.documents,
    isEnd: data.meta.is_end,
    totalCount: data.meta.total_count,
  });
}
