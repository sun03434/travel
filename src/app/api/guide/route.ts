import Anthropic from '@anthropic-ai/sdk';
import { Guide, GuideInputs } from '@/types/place';
import { buildSearchQueries, searchNaverBlog, deduplicateBlogs } from '@/lib/naverSearch';
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

const categoryLabel: Record<string, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  lodging: '숙소',
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

const SYSTEM_PROMPT = `당신은 한국 여행 전문가입니다. 사용자가 요청한 조건과 [블로그 참고자료]를 기반으로 서로 다른 콘셉트의 여행 일정 3가지를 JSON으로 작성합니다.

## 반드시 지켜야 할 규칙
1. [블로그 참고자료]에 구체적인 장소명이 언급된 경우 해당 상호명 그대로 사용. 블로그에 특정 장소가 충분히 언급되지 않은 경우에는 실제 존재하는 유명 장소를 사용해도 됨.
2. 장소 이름은 실제 존재하는 정확한 상호명 사용. 임의로 만든 가상의 장소명 사용 금지.
3. 각 안 내에서 같은 장소가 두 번 이상 등장하면 안 됨 (중복 금지).
4. naverMapUrl 형식: https://map.naver.com/v5/search/{장소명}
5. lat/lng는 알고 있을 때만 포함. 불확실하면 생략.
6. JSON만 반환. 마크다운 코드블록(\`\`\`) 절대 사용 금지.
7. 3가지 안은 각각 다른 테마/콘셉트로 구성할 것 (예: 명소 위주, 맛집 탐방, 힐링 중심 등).

## 맛집(restaurant) 슬롯 특별 규칙
- description에 반드시 포함: 대표 메뉴명과 가격대(예: "대표메뉴: 갈비탕 ₩15,000, 수육 ₩35,000")
- 매 식사 슬롯마다 alternatives 배열에 2개의 대안 식당을 추가할 것
- 대안 식당도 동일하게 상호명, 대표메뉴, 가격대 포함

## 응답 형식
{
  "plans": [
    {
      "name": "안 A: 명소 위주",
      "days": [
        {
          "dayIndex": 1,
          "slots": [
            {
              "timeLabel": "오전",
              "place": {
                "name": "정확한 장소명",
                "category": "attraction",
                "address": "도로명 주소",
                "description": "한두 문장 설명",
                "naverMapUrl": "https://map.naver.com/v5/search/장소명"
              }
            },
            {
              "timeLabel": "점심",
              "place": {
                "name": "식당 상호명",
                "category": "restaurant",
                "address": "도로명 주소",
                "description": "대표메뉴: 메뉴명 ₩가격. 한두 문장 설명.",
                "naverMapUrl": "https://map.naver.com/v5/search/식당명"
              },
              "alternatives": [
                {
                  "name": "대안 식당1",
                  "category": "restaurant",
                  "address": "도로명 주소",
                  "description": "대표메뉴: 메뉴명 ₩가격. 한 문장 설명.",
                  "naverMapUrl": "https://map.naver.com/v5/search/대안식당1"
                },
                {
                  "name": "대안 식당2",
                  "category": "restaurant",
                  "address": "도로명 주소",
                  "description": "대표메뉴: 메뉴명 ₩가격. 한 문장 설명.",
                  "naverMapUrl": "https://map.naver.com/v5/search/대안식당2"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "안 B: 맛집 탐방",
      "days": [...]
    },
    {
      "name": "안 C: 힐링 중심",
      "days": [...]
    }
  ]
}

timeLabel은 반드시 오전, 점심, 오후, 저녁, 숙소 중 하나.
category는 반드시 attraction, restaurant, lodging 중 하나.`;

function buildUserMessage(inputs: GuideInputs, blogContext: string): string {
  const region = getRegionById(inputs.region);
  const regionName = region?.label ?? inputs.region;
  const memberInfo = memberOptions.find((m) => m.id === inputs.member);
  const memberName = memberInfo?.label ?? inputs.member;
  const duration = durationLabel[inputs.duration] ?? inputs.duration;
  const categories = inputs.categories.map((c) => categoryLabel[c]).join(', ');
  const themes = inputs.themes.map((t) => themeLabel[t]).join(', ') || '없음';

  return `## 여행 조건
- 지역: ${regionName}
- 동행: ${memberName}
- 기간: ${duration}
- 카테고리: ${categories}
- 테마: ${themes}${inputs.extraRequest ? `\n- 추가 요청: ${inputs.extraRequest}` : ''}

## 블로그 참고자료
${blogContext}

위 조건과 블로그 참고자료를 기반으로 ${duration} 여행 일정 3가지 안을 JSON으로 작성해주세요. 각 안은 서로 다른 콘셉트로 구성해주세요.`;
}

export async function POST(request: Request) {
  try {
    const { inputs }: { inputs: GuideInputs } = await request.json();

    const queries = buildSearchQueries(inputs);
    const results = await Promise.all(queries.map((q) => searchNaverBlog(q)));
    const blogs = deduplicateBlogs(results.flat()).slice(0, 10);

    const blogContext = blogs.length > 0
      ? blogs.map((b, i) => `[${i + 1}] ${b.title}\n${b.description}`).join('\n\n')
      : '블로그 참고자료를 가져오지 못했습니다. 알고 있는 실제 장소를 기반으로 작성해주세요.';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [
        {
          role: 'user',
          content: buildUserMessage(inputs, blogContext),
        },
      ],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON in response. Raw: ${rawText.slice(0, 200)}`);
    const rawGuide = JSON.parse(jsonMatch[0]);

    if (!rawGuide.plans || !Array.isArray(rawGuide.plans)) {
      throw new Error(`Invalid plans structure. Keys: ${Object.keys(rawGuide).join(', ')}`);
    }

    const guide: Guide = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      inputs,
      plans: rawGuide.plans,
    };

    return Response.json(guide);
  } catch (err) {
    console.error('[guide/route]', err);
    return Response.json({ error: '가이드 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
