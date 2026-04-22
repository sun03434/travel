import { GuideInputs } from '@/types/place';
import { getRegionById } from '@/data/regions';

export interface BlogSnippet {
  title: string;
  description: string;
  link: string;
  postdate: string;
  fullContent?: string;
}

const memberSearchLabel: Record<string, string> = {
  date: '데이트',
  family_infant: '가족여행',
  family_child: '가족여행',
  family_senior: '부모님여행',
  family_3gen: '가족여행',
  friends_small: '친구여행',
  friends_large: '단체여행',
  solo: '혼자여행',
  pet: '반려동물동반여행',
  company: '워크샵',
};

const themeSearchLabel: Record<string, string> = {
  healing: '힐링',
  activity: '액티비티',
  culture: '문화여행',
  night: '야경',
  hotplace: '핫플레이스',
  indoor: '실내여행',
  shopping: '쇼핑',
  nature: '자연',
};

const durationSearchLabel: Record<string, string> = {
  day: '당일치기',
  '1n2d': '1박2일',
  '2n3d': '2박3일',
  '3n4d': '3박4일',
  '4n_plus': '장기여행',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
}

export function buildSearchQueries(inputs: GuideInputs): string[] {
  const region = getRegionById(inputs.region);
  const regionName = region?.label ?? inputs.region;
  const memberLabel = memberSearchLabel[inputs.member] ?? '여행';
  const durationLabel = durationSearchLabel[inputs.duration] ?? '';
  const primaryTheme = inputs.themes[0] ? themeSearchLabel[inputs.themes[0]] : '';

  const queries = [
    `${regionName} ${memberLabel} ${durationLabel} 여행 코스`,
    `${regionName} 여행 추천 ${primaryTheme || '명소'} 맛집`,
  ];

  if (inputs.categories.includes('restaurant')) {
    queries.push(`${regionName} 맛집 추천 ${memberLabel}`);
  }

  return queries;
}

export async function searchNaverBlog(query: string, display = 5): Promise<BlogSnippet[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  const url = `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(query)}&display=${display}&sort=date`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: { title: string; description: string; link: string; postdate: string }) => ({
      title: stripHtml(item.title),
      description: stripHtml(item.description),
      link: item.link,
      postdate: item.postdate,
    }));
  } catch {
    return [];
  }
}

export function deduplicateBlogs(blogs: BlogSnippet[]): BlogSnippet[] {
  const seen = new Set<string>();
  return blogs.filter((b) => {
    if (seen.has(b.link)) return false;
    seen.add(b.link);
    return true;
  });
}

// 네이버 블로그 URL을 모바일 URL로 변환 (SSR 콘텐츠 접근성 향상)
function toFetchableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('blog.naver.com')) return url;

    // ?Redirect=Log&logNo=xxx 형식 처리
    const logNo = parsed.searchParams.get('logNo');
    const blogId = parsed.pathname.split('/').filter(Boolean)[0];
    if (logNo && blogId) return `https://m.blog.naver.com/${blogId}/${logNo}`;

    // /blogId/logNo 경로 형식 처리
    return url.replace('://blog.naver.com/', '://m.blog.naver.com/');
  } catch {
    return url;
  }
}

function extractTextFromHtml(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  return cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function fetchBlogContent(url: string): Promise<string | null> {
  try {
    const fetchUrl = toFetchableUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;

    const html = await res.text();
    const text = extractTextFromHtml(html);

    if (text.length < 150) return null;
    return text.slice(0, 3000);
  } catch {
    return null;
  }
}

export async function enrichBlogsWithContent(blogs: BlogSnippet[]): Promise<BlogSnippet[]> {
  const results = await Promise.all(
    blogs.map(async (blog) => {
      const fullContent = await fetchBlogContent(blog.link);
      return fullContent ? { ...blog, fullContent } : blog;
    })
  );
  return results;
}
