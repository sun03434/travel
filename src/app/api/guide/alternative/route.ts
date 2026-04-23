import Anthropic from '@anthropic-ai/sdk';
import { Plan, GuideInputs } from '@/types/place';
import { getRegionById } from '@/data/regions';
import { memberOptions } from '@/data/members';

const client = new Anthropic();

const durationLabel: Record<string, string> = {
  day: '당일치기',
  '1n2d': '1박 2일',
  '2n3d': '2박 3일',
  '3n4d': '3박 4일',
  '4n_plus': '4박 이상',
};

const themeLabel: Record<string, string> = {
  healing: '힐링',
  activity: '액티비티',
  culture: '문화·예술',
  night: '야경',
  hotplace: '핫플레이스',
  indoor: '실내',
  shopping: '쇼핑',
  nature: '자연',
};

const SYSTEM_PROMPT = `당신은 한국 여행 일정 작성 도우미입니다. 반드시 아래 규칙을 지켜 JSON을 반환합니다.

## 핵심 규칙 (절대 위반 금지)
1. **블로그 출처 장소만 사용**: [블로그 참고자료]에 직접 언급된 장소명만 포함할 것. **sourceUrl을 채울 수 없는 장소는 일정에 포함하지 말 것.**
2. **정확한 상호명**: 블로그에 나온 그대로의 상호명 사용.
3. **동선 최적화**: 하루 일정 내 장소들은 지리적으로 인접한 순서로 배치.
4. **하루 내 중복 금지**: 동일 장소를 하루에 두 번 이상 배치 금지.
5. **naverMapUrl 형식**: https://map.naver.com/v5/search/{지역명}+{장소명}
6. **sourceUrl**: 해당 장소 정보를 참고한 블로그의 URL.
7. **description**: 1~2문장으로 간결하게. 불필요한 수식어 배제.
8. **lat/lng**: 알고 있을 때만 포함. 불확실하면 생략.
9. **JSON만 반환**: 마크다운 코드블록(\`\`\`) 절대 사용 금지.
10. **블로그 정보 부족 시**: 확인된 장소만 넣을 것. 없는 장소 지어내지 말 것.
11. **기존 플랜과 차별화**: 기존 플랜에서 사용된 장소는 최대한 배제하고, 다른 콘셉트와 다른 장소로 구성할 것.

## 맛집(restaurant) 슬롯 특별 규칙
- description에 대표 메뉴명과 가격대 포함 (예: "대표메뉴: 갈비탕 ₩15,000")
- 매 식사 슬롯마다 alternatives 배열에 2개의 대안 식당 추가 (블로그 출처 장소여야 함)

## 응답 형식 (1개 플랜만 반환)
{"plans":[{"name":"안 {letter}: {콘셉트명}","days":[{"dayIndex":1,"slots":[{"timeLabel":"오전","place":{"name":"장소명","category":"attraction","address":"도로명 주소","description":"간결한 1~2문장.","naverMapUrl":"https://map.naver.com/v5/search/지역명+장소명","sourceUrl":"https://blog.naver.com/..."}},{"timeLabel":"점심","place":{"name":"식당명","category":"restaurant","address":"...","description":"대표메뉴: 메뉴명 ₩가격.","naverMapUrl":"...","sourceUrl":"..."},"alternatives":[{"name":"대안1","category":"restaurant","address":"...","description":"대표메뉴: 메뉴명 ₩가격.","naverMapUrl":"...","sourceUrl":"..."},{"name":"대안2","category":"restaurant","address":"...","description":"대표메뉴: 메뉴명 ₩가격.","naverMapUrl":"...","sourceUrl":"..."}]}]}]}]}

timeLabel: 오전, 점심, 오후, 저녁, 숙소 중 하나. category: attraction, restaurant, lodging 중 하나.`;

export async function POST(request: Request) {
  const t0 = Date.now();
  try {
    const { inputs, blogContext, existingPlanNames, planLabel }: {
      inputs: GuideInputs;
      blogContext: string;
      existingPlanNames: string[];
      planLabel: string;
    } = await request.json();

    const region = getRegionById(inputs.region);
    const regionName = region?.label ?? inputs.region;
    const memberInfo = memberOptions.find((m) => m.id === inputs.member);
    const memberName = memberInfo?.label ?? inputs.member;
    const duration = durationLabel[inputs.duration] ?? inputs.duration;
    const themes = inputs.themes.map((t) => themeLabel[t]).join(', ') || '없음';

    const userMessage = `## 여행 조건
- 지역: ${regionName}
- 동행: ${memberName}
- 기간: ${duration}
- 테마: ${themes}${inputs.extraRequest ? `\n- 추가 요청: ${inputs.extraRequest}` : ''}

## 기존 플랜 (이 플랜들과 다른 콘셉트 + 다른 장소로 구성할 것)
${existingPlanNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

## 블로그 참고자료
${blogContext}

위 여행 조건을 기반으로 기존 플랜들과 콘셉트가 다른 새로운 여행 일정 1가지를 JSON으로 작성해주세요.
플랜 이름 형식: "안 ${planLabel}: {콘셉트명}"`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{ role: 'user', content: userMessage }],
    });

    const { input_tokens, output_tokens } = response.usage;
    const costUsd = ((input_tokens / 1_000_000) * 3 + (output_tokens / 1_000_000) * 15).toFixed(4);
    console.log(`[guide/alternative][${Date.now() - t0}ms] 완료 | 입력 ${input_tokens} / 출력 ${output_tokens} 토큰 (≈$${costUsd})`);

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in alternative response');
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.plans?.[0]) throw new Error('No plan in alternative response');

    return Response.json({ plan: parsed.plans[0] as Plan });
  } catch (err) {
    console.error('[guide/alternative]', err);
    return Response.json({ error: '대안 플랜 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
