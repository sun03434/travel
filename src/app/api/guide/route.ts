import Anthropic from '@anthropic-ai/sdk';
import { Guide, GuideInputs } from '@/types/place';
import { buildSearchQueries, searchNaverBlog, deduplicateBlogs, filterBlogsByTitle, enrichBlogsWithContent, BlogSnippet } from '@/lib/naverSearch';
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

## 맛집(restaurant) 슬롯 특별 규칙
- description에 대표 메뉴명과 가격대 포함 (예: "대표메뉴: 갈비탕 ₩15,000")
- 매 식사 슬롯마다 alternatives 배열에 2개의 대안 식당 추가 (블로그 출처 장소여야 함)

## 응답 형식 (1개 플랜만 반환)
{"plans":[{"name":"안 A: {콘셉트명}","days":[{"dayIndex":1,"slots":[{"timeLabel":"오전","place":{"name":"장소명","category":"attraction","address":"도로명 주소","description":"간결한 1~2문장.","naverMapUrl":"https://map.naver.com/v5/search/지역명+장소명","sourceUrl":"https://blog.naver.com/..."}},{"timeLabel":"점심","place":{"name":"식당명","category":"restaurant","address":"도로명 주소","description":"대표메뉴: 메뉴명 ₩가격. 간결한 설명.","naverMapUrl":"https://map.naver.com/v5/search/지역명+식당명","sourceUrl":"https://blog.naver.com/..."},"alternatives":[{"name":"대안식당1","category":"restaurant","address":"...","description":"대표메뉴: 메뉴명 ₩가격.","naverMapUrl":"...","sourceUrl":"..."},{"name":"대안식당2","category":"restaurant","address":"...","description":"대표메뉴: 메뉴명 ₩가격.","naverMapUrl":"...","sourceUrl":"..."}]}]}]}]}

timeLabel: 오전, 점심, 오후, 저녁, 숙소 중 하나. category: attraction, restaurant, lodging 중 하나.`;

async function rerankBlogsWithHaiku(
  blogs: BlogSnippet[],
  inputs: GuideInputs,
  regionName: string
): Promise<{ passed: BlogSnippet[]; removedCount: number }> {
  const memberInfo = memberOptions.find((m) => m.id === inputs.member);
  const memberName = memberInfo?.label ?? inputs.member;
  const duration = durationLabel[inputs.duration] ?? inputs.duration;
  const themes = inputs.themes.map((t) => themeLabel[t]).join(', ') || '없음';

  const checks = await Promise.all(
    blogs.map(async (blog) => {
      const content = blog.fullContent ?? blog.description;
      const prompt = `다음 블로그가 아래 여행 조건에 맞는 실제 여행 후기인지 판단해줘.

조건:
- 지역: ${regionName}
- 동행: ${memberName}
- 기간: ${duration}
- 테마: ${themes}

블로그 제목: ${blog.title}
블로그 내용: ${content.slice(0, 1500)}

yes 또는 no 하나만 출력. yes = 조건에 부합하는 실제 여행 후기. no = 광고·무관한 지역·제품 리뷰·조건 불일치.`;

      try {
        const res = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = res.content[0].type === 'text' ? res.content[0].text.trim().toLowerCase() : 'yes';
        return { blog, relevant: text.startsWith('yes') };
      } catch {
        return { blog, relevant: true };
      }
    })
  );

  const passed = checks.filter((c) => c.relevant).map((c) => c.blog);
  return { passed, removedCount: blogs.length - passed.length };
}

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

위 조건과 블로그 참고자료를 기반으로 ${duration} 여행 일정 1가지 안(안 A)을 JSON으로 작성해주세요.`;
}

export async function POST(request: Request) {
  const t0 = Date.now();
  const elapsed = () => `${Date.now() - t0}ms`;

  try {
    const { inputs }: { inputs: GuideInputs } = await request.json();

    const region = getRegionById(inputs.region);
    const regionName = region?.label ?? inputs.region;

    // Step 1: 다중 쿼리 병렬 검색 (sim/date 혼합)
    const queries = buildSearchQueries(inputs);
    const results = await Promise.all(queries.map(({ query, sort }) => searchNaverBlog(query, 4, sort)));
    const searchedBlogs = deduplicateBlogs(results.flat());
    console.log(`[guide][${elapsed()}] 검색: 쿼리 ${queries.length}개 → 중복 제거 후 ${searchedBlogs.length}개`);
    queries.forEach(({ query, sort }, i) => console.log(`  [Q${i + 1}/${sort}] "${query}" → ${results[i].length}건`));

    // Step 2: 제목 기반 1차 필터
    const titleFiltered = filterBlogsByTitle(searchedBlogs, regionName);
    console.log(`[guide][${elapsed()}] 제목 필터: ${searchedBlogs.length} → ${titleFiltered.length}개 (${searchedBlogs.length - titleFiltered.length}개 제거)`);

    // Step 3: 본문 크롤링 (최대 12개)
    const toCrawl = titleFiltered.slice(0, 12);
    const enrichedBlogs = toCrawl.length > 0 ? await enrichBlogsWithContent(toCrawl) : [];
    const crawledCount = enrichedBlogs.filter((b) => b.fullContent).length;
    console.log(`[guide][${elapsed()}] 크롤링: ${enrichedBlogs.length}개 중 ${crawledCount}개 본문 성공`);

    // Step 4: Haiku 관련도 필터 (병렬)
    const { passed: rerankPassed, removedCount: rerankRemoved } = await rerankBlogsWithHaiku(enrichedBlogs, inputs, regionName);
    console.log(`[guide][${elapsed()}] Haiku 필터: ${enrichedBlogs.length} → ${rerankPassed.length}개 (${rerankRemoved}개 제거)`);

    // 최대 5건으로 캡. 미달 시 크롤링 결과로 fallback
    const MAX_BLOGS = 5;
    const MIN_BLOGS = 3;
    const candidateBlogs = rerankPassed.length >= MIN_BLOGS ? rerankPassed : enrichedBlogs;
    const finalBlogs = candidateBlogs.slice(0, MAX_BLOGS);
    if (rerankPassed.length < MIN_BLOGS) {
      console.log(`[guide][${elapsed()}] Haiku 필터 후 부족(${rerankPassed.length}개) → fallback ${finalBlogs.length}개`);
    }
    console.log(`[guide][${elapsed()}] 최종 Claude 전달: ${finalBlogs.length}개 블로그`);

    const blogContext =
      finalBlogs.length > 0
        ? finalBlogs
            .map((b, i) => {
              const content = b.fullContent ?? `[스니펫] ${b.description}`;
              return `[블로그${i + 1}] ${b.title}\nURL: ${b.link}\n${content}`;
            })
            .join('\n\n---\n\n')
        : '블로그 참고자료를 가져오지 못했습니다.';

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
      messages: [
        {
          role: 'user',
          content: buildUserMessage(inputs, blogContext),
        },
      ],
    });

    const { input_tokens, output_tokens } = response.usage;
    const costUsd = ((input_tokens / 1_000_000) * 3 + (output_tokens / 1_000_000) * 15).toFixed(4);
    console.log(`[guide][${elapsed()}] 완료 | 입력 ${input_tokens} / 출력 ${output_tokens} 토큰 (≈$${costUsd})`);

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
      sourceBlogUrls: finalBlogs.map((b) => ({ title: b.title, url: b.link })),
      blogContext,
    };

    return Response.json(guide);
  } catch (err) {
    console.error('[guide/route]', err);
    return Response.json({ error: '가이드 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
