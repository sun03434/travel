import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TravelPlan, ScheduledDay, ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';
import { getDatesInRange, getDayLabel, generateId, sortSlotsByTime } from '@/lib/utils';

export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM = `당신은 한국 여행 일정 최적화 전문가입니다.

━━━ 하루 일정 구조 (자유롭게 구성) ━━━
- 슬롯 개수는 고정이 아니다. 하루에 필요한 만큼 슬롯을 자유롭게 만들어라.
- 각 슬롯의 시작(time)·종료(endTime) 시간을 직접 정한다. 반드시 하루 안에서 시간 오름차순으로 정렬해서 출력.
- 식사 시간대를 자연스럽게 반영: 필요하면 아침(08:00~09:00), 점심(12:00 전후), 저녁(18:00 전후) 식사 슬롯을 넣는다.
- 하루 흐름 예: 아침식사 → 오전 여행 → 점심 → 오후 여행 → 카페 → 저녁 → 숙소.
- 첫날은 startTime부터 시작, 마지막날은 endTime에 맞춰 종료.
- 숙소 슬롯(type:"lodging")은 해당 날 체크인 숙소가 있을 때만, 하루의 마지막에 배치.

━━━ 절대 금지 ━━━
- 위시리스트에 없는 장소를 새로 창작해서 추가 금지
- 식당은 식사 시간대에만 배치. 아침·점심·저녁 각 시간대에 식당은 최대 1곳.
- 점심/저녁에 영업하지 않는 식당을 해당 식사 슬롯에 배치 금지

━━━ 빈 슬롯 처리 ━━━
- 등록된 장소가 부족하면, 비워둘 시간대에 type:"empty" 슬롯을 그 시간 위치에 배치 (placeId는 null)
- 빈 슬롯도 시간 순서에 맞는 자리에 넣고, 절대 맨 뒤에 몰아서 배치하지 말 것

━━━ 장소 배치 전략 ━━━
- 좌표 기준 가까운 장소끼리 같은 날, 연속된 슬롯에 배치
- 장소 간 이동 시간 고려 (직선 1km ≈ 자동차 3분 기준으로 시작/종료 시간 조정)
- 숙소 위치를 동선의 기점 또는 종점으로 활용
- 식당의 영업시간이 있으면 점심(11:30~14:00)/저녁(17:00~22:00) 영업 여부 확인

━━━ 출력 규칙 ━━━
- 순수 JSON만 출력 (마크다운 코드블록, 설명 텍스트 일절 금지)
- placeId는 반드시 제공된 id 값을 그대로 사용 (변형 금지)
- 빈 슬롯의 placeId는 null
- 각 날의 slots는 time 오름차순으로 정렬

{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "id": "고유ID",
          "time": "08:00",
          "endTime": "09:00",
          "type": "empty",
          "placeId": null,
          "warning": null
        },
        {
          "id": "고유ID",
          "time": "09:30",
          "endTime": "11:30",
          "type": "wish",
          "placeId": "등록된장소의id",
          "warning": null
        }
      ]
    }
  ]
}`;

function extractJson(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

export async function POST(req: NextRequest) {
  const plan: TravelPlan = await req.json();

  const dates = getDatesInRange(plan.period.startDate, plan.period.endDate);
  const allPlaces = [...plan.wishlist.attractions, ...plan.wishlist.restaurants];
  const lodgings = plan.wishlist.lodgings;

  const placesList = allPlaces
    .map(
      (p) =>
        `id="${p.id}" 이름="${p.name}" 카테고리=${p.category} 좌표=(${p.lat},${p.lng})` +
        (p.openingHours ? ` 영업시간=${p.openingHours}` : '') +
        (p.closedDays?.length ? ` 정기휴무=${p.closedDays.join(',')}` : '')
    )
    .join('\n');

  const lodgingsList = lodgings
    .map(
      (l) =>
        `id="${l.id}" 이름="${l.name}" 카테고리=lodging 좌표=(${l.lat},${l.lng}) 체크인=${l.checkInDate} 체크아웃=${l.checkOutDate}`
    )
    .join('\n');

  const userMessage = `여행 정보:
지역: ${plan.region.displayName}
기간: ${plan.period.startDate} ${plan.period.startTime} ~ ${plan.period.endDate} ${plan.period.endTime}
총 ${dates.length}일: ${dates.join(', ')}

━ 등록된 여행지/음식점 (반드시 전부 일정에 배치할 것) ━
${placesList || '(없음)'}

━ 숙소 ━
${lodgingsList || '(없음)'}

위 장소들을 하루 구조에 맞게 동선 최적화하여 배치하고, 빈 시간대는 empty 슬롯으로 채워주세요.
JSON만 출력하세요.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text;
  const jsonStr = extractJson(raw);

  let parsed: {
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

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('JSON parse error. Raw:', raw.slice(0, 500));
    return NextResponse.json({ error: 'AI 응답 파싱 실패. 다시 시도해주세요.' }, { status: 500 });
  }

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
      slots: sortSlotsByTime(slots),
      naverRouteUrl: '',
    };
  });

  return NextResponse.json({ schedule });
}
