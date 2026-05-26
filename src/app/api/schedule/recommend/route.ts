import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { WishPlace } from '@/types/plan';
import { generateId } from '@/lib/utils';

export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM = `당신은 한국 여행 장소 추천 전문가입니다.
전후 일정 장소의 위치를 고려하여 동선상 자연스러운 장소를 추천하세요.
반드시 실제로 존재하는 장소만 추천하세요.
JSON 형식으로만 응답하세요.`;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    region: string;
    date: string;
    slotTime: string;
    category: 'attraction' | 'restaurant' | 'cafe';
    prevPlace?: { name: string; lat: number; lng: number };
    nextPlace?: { name: string; lat: number; lng: number };
    regionLat: number;
    regionLng: number;
  };

  const context = [
    body.prevPlace && `직전 장소: ${body.prevPlace.name} (${body.prevPlace.lat},${body.prevPlace.lng})`,
    body.nextPlace && `직후 장소: ${body.nextPlace.name} (${body.nextPlace.lat},${body.nextPlace.lng})`,
  ]
    .filter(Boolean)
    .join('\n');

  const categoryLabel =
    body.category === 'attraction' ? '관광지/체험 명소' :
    body.category === 'restaurant' ? '음식점' : '카페';

  const userMessage = `지역: ${body.region}
날짜: ${body.date} ${body.slotTime}
추천 카테고리: ${categoryLabel}
${context}

위 동선상 자연스러운 ${categoryLabel} 3곳을 추천해주세요.
각 장소는 전후 장소에서 차로 20분 이내여야 합니다.

응답 형식:
{
  "recommendations": [
    {
      "name": "장소명",
      "category": "attraction|restaurant|cafe",
      "address": "도로명주소",
      "lat": 위도,
      "lng": 경도,
      "reason": "추천 이유 한 줄"
    }
  ]
}`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'));
  const parsed = JSON.parse(jsonStr) as {
    recommendations: {
      name: string;
      category: string;
      address: string;
      lat: number;
      lng: number;
      reason: string;
    }[];
  };

  const places: (WishPlace & { reason: string })[] = parsed.recommendations.map((r) => ({
    id: generateId(),
    kakaoId: '',
    name: r.name,
    category: r.category as WishPlace['category'],
    address: r.address,
    roadAddress: r.address,
    lat: r.lat,
    lng: r.lng,
    kakaoMapUrl: `https://map.kakao.com/link/search/${encodeURIComponent(r.name)}`,
    reason: r.reason,
  }));

  return NextResponse.json({ recommendations: places });
}
