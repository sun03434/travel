import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TravelPlan, ScheduledDay, ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';
import { getDatesInRange, getDayLabel, generateId } from '@/lib/utils';

export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM = `당신은 한국 여행 일정 최적화 전문가입니다.

━━━ 하루 일정 구조 (반드시 이 순서·슬롯 수를 지킬 것) ━━━
슬롯1  오전여행   09:00~11:30  attraction/cafe/shopping 중 1곳
슬롯2  점심식사   12:00~13:00  restaurant 1곳 (점심 영업 필수)
슬롯3  오후여행   13:30~16:00  attraction/cafe/shopping 중 1곳
슬롯4  저녁식사   18:00~19:30  restaurant 1곳 (저녁 영업 필수)
슬롯5  숙소       20:00~       해당 날 체크인 숙소 (있을 때만)

첫날: startTime부터 시작, 마지막날: endTime에 맞춰 종료

━━━ 절대 금지 ━━━
- 하루에 restaurant 3곳 이상 배치 절대 금지
- 점심 슬롯(12:00)과 저녁 슬롯(18:00)에 각각 restaurant 1곳만
- 점심에 영업하지 않는 식당을 점심 슬롯에 배치 금지
- 위시리스트에 없는 장소를 새로 창작해서 추가 금지

━━━ 빈 슬롯 처리 ━━━
- 위시리스트 장소가 부족한 시간대는 그 시간대 위치에 type:"empty" 슬롯 배치
- 빈 슬롯을 절대 맨 뒤에 몰아서 배치하지 말 것
- 올바른 예: [오전empty][점심식당][오후여행지][저녁empty]
- 잘못된 예: [오전여행지][점심식당][저녁식당][오후empty][오전empty]

━━━ 장소 배치 전략 ━━━
- 좌표 기준 가까운 장소끼리 같은 날, 연속된 슬롯에 배치
- 장소 간 이동 시간 고려 (직선 1km ≈ 자동차 3분 기준으로 시작/종료 시간 조정)
- 숙소 위치를 동선의 기점 또는 종점으로 활용
- 식당의 영업시간이 있으면 점심(11:30~14:00)/저녁(17:00~22:00) 영업 여부 확인

━━━ 출력 규칙 ━━━
- 순수 JSON만 출력 (마크다운 코드블록, 설명 텍스트 일절 금지)
- placeId는 반드시 제공된 id 값을 그대로 사용 (변형 금지)
- 빈 슬롯의 placeId는 null

{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "id": "고유ID",
          "time": "HH:mm",
          "endTime": "HH:mm",
          "type": "wish",
          "placeId": "등록된장소의id",
          "warning": null
        },
        {
          "id": "고유ID",
          "time": "12:00",
          "endTime": "13:00",
          "type": "empty",
          "placeId": null,
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
      slots,
      naverRouteUrl: '',
    };
  });

  return NextResponse.json({ schedule });
}
