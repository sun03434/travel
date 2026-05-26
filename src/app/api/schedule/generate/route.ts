import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TravelPlan, ScheduledDay, ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';
import { getDatesInRange, getDayLabel, generateId } from '@/lib/utils';

export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM = `당신은 한국 여행 일정 최적화 전문가입니다.

규칙:
1. 사용자가 등록한 장소만 일정에 배치하세요. 절대 새로운 장소를 창작하지 마세요.
2. 위도·경도를 기반으로 같은 날 방문할 장소들을 지리적으로 클러스터링하세요.
3. 이동 거리를 최소화하는 순서로 배치하세요 (동선 최적화).
4. 숙소가 있는 경우 그 날의 시작점 또는 종점으로 활용하세요.
5. 음식점·카페는 식사 시간대(점심 12-13시, 저녁 18-19시)에 우선 배치하세요.
6. 위시리스트의 모든 장소를 배치한 후, 빈 시간대는 type: "empty"로 채우세요.
7. 영업시간을 확인하여 방문 시간이 맞지 않으면 warning 필드에 한 줄로 경고를 작성하세요.
8. 각 장소 방문 소요 시간: 관광지 1.5-2시간, 식당 1시간, 숙소 제외.
9. 첫날은 startTime부터, 마지막 날은 endTime까지만 일정을 채우세요.

반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없음):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "id": "uuid",
          "time": "HH:mm",
          "endTime": "HH:mm",
          "type": "wish" | "lodging" | "empty",
          "placeId": "위시리스트 장소 id 또는 null",
          "warning": "경고 메시지 또는 null"
        }
      ]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const plan: TravelPlan = await req.json();

  const dates = getDatesInRange(plan.period.startDate, plan.period.endDate);
  const allPlaces = [...plan.wishlist.attractions, ...plan.wishlist.restaurants];
  const lodgings = plan.wishlist.lodgings;

  const placesList = allPlaces
    .map(
      (p) =>
        `[${p.id}] ${p.name} (${p.category}) — 좌표: ${p.lat},${p.lng}` +
        (p.openingHours ? ` — 영업시간: ${p.openingHours}` : '') +
        (p.closedDays?.length ? ` — 정기휴무: ${p.closedDays.join(', ')}` : '')
    )
    .join('\n');

  const lodgingsList = lodgings
    .map(
      (l) =>
        `[${l.id}] ${l.name} (숙소) — 좌표: ${l.lat},${l.lng} — 체크인: ${l.checkInDate}, 체크아웃: ${l.checkOutDate}`
    )
    .join('\n');

  const userMessage = `여행 정보:
- 지역: ${plan.region.displayName}
- 여행 기간: ${plan.period.startDate} ${plan.period.startTime} ~ ${plan.period.endDate} ${plan.period.endTime}
- 일수: ${dates.length}일

위시리스트 (반드시 모두 배치):
${placesList || '(없음)'}

숙소:
${lodgingsList || '(없음)'}

각 날짜: ${dates.join(', ')}

위 장소들을 동선 최적화하여 일정을 JSON으로 생성해주세요.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'));
  const parsed = JSON.parse(jsonStr) as {
    days: {
      date: string;
      slots: {
        id: string;
        time: string;
        endTime: string;
        type: string;
        placeId: string | null;
        warning: string | null;
      }[];
    }[];
  };

  const placeMap = new Map<string, WishPlace | WishLodging>(
    [...allPlaces, ...lodgings].map((p) => [p.id, p])
  );

  const schedule: ScheduledDay[] = parsed.days.map((day, idx) => {
    const slots: ScheduledSlot[] = day.slots.map((s) => ({
      id: s.id || generateId(),
      time: s.time,
      endTime: s.endTime,
      type: s.type as ScheduledSlot['type'],
      place: s.placeId ? placeMap.get(s.placeId) : undefined,
      warning: s.warning ?? undefined,
    }));

    return {
      date: day.date,
      dayLabel: getDayLabel(day.date, idx),
      slots,
      naverRouteUrl: '',
    };
  });

  return NextResponse.json({ schedule });
}
