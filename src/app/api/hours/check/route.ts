import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { WishPlace } from '@/types/plan';

export const maxDuration = 30;

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { places, dates }: { places: WishPlace[]; dates: string[] } = await req.json();

  const placesWithHours = places.filter((p) => p.openingHours || p.closedDays?.length);
  if (placesWithHours.length === 0) return NextResponse.json({ warnings: [] });

  const list = placesWithHours
    .map(
      (p) =>
        `- ${p.name} (id: ${p.id})` +
        (p.openingHours ? ` 영업시간: ${p.openingHours}` : '') +
        (p.closedDays?.length ? ` 정기휴무: ${p.closedDays.join(',')}` : '')
    )
    .join('\n');

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `다음 장소들의 영업시간을 확인하여, 지정된 날짜에 휴무이거나 방문이 어려운 경우를 알려주세요.

장소 목록:
${list}

방문 예정 날짜: ${dates.join(', ')}

JSON으로만 응답:
{
  "warnings": [
    { "placeId": "id", "date": "YYYY-MM-DD", "message": "경고 내용" }
  ]
}`,
      },
    ],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'));
  const parsed = JSON.parse(jsonStr);

  return NextResponse.json(parsed);
}
