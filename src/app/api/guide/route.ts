import Anthropic from '@anthropic-ai/sdk';
import { Guide, GuideInputs } from '@/types/place';
import { buildSearchQueries, searchNaverBlog, deduplicateBlogs, enrichBlogsWithContent } from '@/lib/naverSearch';
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

const SYSTEM_PROMPT = `당신은 한국 여행 일정 작성 도우미입니다. 반드시 아래 규칙을 지켜 JSON을 반환합니다.

## 핵심 규칙 (절대 위반 금지)
1. **블로그 출처 장소만 사용**: [블로그 참고자료]에 직접 언급된 장소명만 일정에 포함할 것. 블로그에 등장하지 않은 장소는 절대 추가하지 말 것. LLM 학습 데이터 기반으로 장소를 만들어내는 행위 금지.
2. **정확한 상호명**: 블로그에 나온 그대로의 상호명 사용. 임의 변형 금지.
3. **동선 최적화**: 하루 일정 내 장소들은 지리적으로 인접한 순서로 배치. 멀리 떨어진 곳을 번갈아 가는 동선 금지.
4. **중복 금지**: 같은 안(plan) 내에서 동일 장소 재등장 금지.
5. **naverMapUrl 형식**: https://map.naver.com/v5/search/{지역명}+{장소명} (지역명 포함하여 검색 정확도 향상)
6. **sourceUrl**: 해당 장소 정보를 참고한 블로그의 URL. 블로그 번호에 대응하는 URL 사용. 참고 블로그가 없으면 생략.
7. **lat/lng**: 알고 있을 때만 포함. 불확실하면 생략.
8. **JSON만 반환**: 마크다운 코드블록(\`\`\`) 절대 사용 금지.
9. **3가지 안**: 각각 다른 테마/콘셉트로 구성 (예: 명소 위주, 맛집 탐방, 힐링 중심).
10. **블로그 정보 부족 시**: 장소 수가 적더라도 확인된 장소만 넣을 것. 없는 장소 지어내지 말 것.

## 맛집(restaurant) 슬롯 특별 규칙
- description에 반드시 포함: 대표 메뉴명과 가격대 (예: "대표메뉴: 갈비탕 ₩15,000, 수육 ₩35,000")
- 매 식사 슬롯마다 alternatives 배열에 2개의 대안 식당 추가 (모두 블로그 출처 장소여야 함)

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
                "name": "장소명",
                "category": "attraction",
                "address": "도로명 주소",
                "description": "한두 문장 설명",
                "naverMapUrl": "https://map.naver.com/v5/search/지역명+장소명",
                "sourceUrl": "https://blog.naver.com/..."
              }
            },
            {
              "timeLabel": "점심",
              "place": {
                "name": "식당명",
                "category": "restaurant",
                "address": "도로명 주소",
                "description": "대표메뉴: 메뉴명 ₩가격. 한 문장 설명.",
                "naverMapUrl": "https://map.naver.com/v5/search/지역명+식당명",
                "sourceUrl": "https://blog.naver.com/..."
              },
              "alternatives": [
                {
                  "name": "대안 식당1",
                  "category": "restaurant",
                  "address": "도로명 주소",
                  "description": "대표메뉴: 메뉴명 ₩가격.",
                  "naverMapUrl": "https://map.naver.com/v5/search/지역명+대안식당1",
                  "sourceUrl": "https://blog.naver.com/..."
                },
                {
                  "name": "대안 식당2",
                  "category": "restaurant",
                  "address": "도로명 주소",
                  "description": "대표메뉴: 메뉴명 ₩가격.",
                  "naverMapUrl": "https://map.naver.com/v5/search/지역명+대안식당2",
                  "sourceUrl": "https://blog.naver.com/..."
                }
              ]
            }
          ]
        }
      ]
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
아래 블로그에 언급된 장소만 일정에 포함하세요. 블로그에 없는 장소는 절대 추가하지 마세요.

${blogContext}

위 조건과 블로그 참고자료를 기반으로 ${duration} 여행 일정 3가지 안을 JSON으로 작성해주세요.`;
}

export async function POST(request: Request) {
  try {
    const { inputs }: { inputs: GuideInputs } = await request.json();

    const queries = buildSearchQueries(inputs);
    const results = await Promise.all(queries.map((q) => searchNaverBlog(q)));
    const blogs = deduplicateBlogs(results.flat()).slice(0, 10);

    // 블로그 본문 크롤링 시도 (실패 시 스니펫으로 fallback)
    const enrichedBlogs = blogs.length > 0 ? await enrichBlogsWithContent(blogs) : [];

    const crawledCount = enrichedBlogs.filter((b) => b.fullContent).length;
    console.log(`[guide] 블로그 ${enrichedBlogs.length}개 중 ${crawledCount}개 본문 크롤링 성공`);

    const blogContext =
      enrichedBlogs.length > 0
        ? enrichedBlogs
            .map((b, i) => {
              const content = b.fullContent ?? `[스니펫] ${b.description}`;
              return `[블로그${i + 1}] ${b.title}\nURL: ${b.link}\n${content}`;
            })
            .join('\n\n---\n\n')
        : '블로그 참고자료를 가져오지 못했습니다. 일정 생성이 제한될 수 있습니다.';

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
      sourceBlogUrls: enrichedBlogs.map((b) => ({ title: b.title, url: b.link })),
    };

    return Response.json(guide);
  } catch (err) {
    console.error('[guide/route]', err);
    return Response.json({ error: '가이드 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
