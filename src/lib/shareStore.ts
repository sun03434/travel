import { Redis } from '@upstash/redis';
import type { TravelPlan, ScheduledDay } from '@/types/plan';

// 환경변수가 없는 빌드 타임에 죽지 않도록 요청 시점에 지연 생성한다.
// Vercel 마켓플레이스 연결 방식에 따라 UPSTASH_* 또는 KV_* 로 주입될 수 있어 둘 다 지원.
let _redis: Redis | null = null;
function redis(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Redis 환경변수(UPSTASH_REDIS_REST_URL/TOKEN 또는 KV_REST_API_URL/TOKEN)가 없습니다.');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const TTL_SECONDS = 60 * 60 * 24 * 180; // 180일 보관
// 헷갈리는 문자(0/O/1/l 등) 제외한 base56
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export function genShareId(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

/** 공유 저장 크기를 줄이기 위해 뷰에서 재생성되는 경로 URL을 제거 */
function slimForStore(plan: TravelPlan): TravelPlan {
  return {
    ...plan,
    schedule: plan.schedule.map((day): ScheduledDay => ({
      date: day.date,
      dayLabel: day.dayLabel,
      weather: day.weather,
      slots: day.slots,
      naverRouteUrl: '',
    })),
  };
}

/** 플랜을 저장하고 짧은 공유 ID를 반환 (충돌 시 재시도) */
export async function putSharedPlan(plan: TravelPlan): Promise<string> {
  const slim = slimForStore(plan);
  for (let i = 0; i < 5; i++) {
    const id = genShareId();
    const created = await redis().set(`share:${id}`, slim, { ex: TTL_SECONDS, nx: true });
    if (created) return id;
  }
  throw new Error('공유 ID 생성 실패');
}

export async function getSharedPlan(id: string): Promise<TravelPlan | null> {
  const data = await redis().get<TravelPlan>(`share:${id}`);
  return data ?? null;
}
