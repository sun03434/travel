import type { TravelPlan, ScheduledDay } from '@/types/plan';
import { buildNaverRouteUrl, buildNaverAppRouteUrl } from './naverRoute';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error';
export interface ShareOutcome {
  result: ShareResult;
  url: string;
}

/**
 * 공유 URL 크기를 줄이기 위해 공유 뷰에서 다시 계산되는 파생 필드를 제거한다.
 * (긴 네이버 경로 URL 문자열이 URL 길이의 주범 → 뷰에서 재생성)
 */
function slimForShare(plan: TravelPlan): TravelPlan {
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

/** 공유/불러오기 뷰에서 제거됐던 네이버 경로 URL을 다시 생성 */
export function rebuildRouteUrls(plan: TravelPlan): TravelPlan {
  return {
    ...plan,
    schedule: plan.schedule.map((day) => ({
      ...day,
      naverRouteUrl: buildNaverRouteUrl(day.slots),
      naverAppRouteUrl: buildNaverAppRouteUrl(day.slots),
    })),
  };
}

// ── 레거시(백엔드 미가용 시) 폴백: 플랜 전체를 URL에 임베드 ──
export function encodePlan(plan: TravelPlan): string {
  const json = JSON.stringify(slimForShare(plan));
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodePlan(encoded: string): TravelPlan | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json) as TravelPlan;
  } catch {
    return null;
  }
}

export function buildEmbeddedShareUrl(plan: TravelPlan): string {
  const encoded = encodePlan(plan);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/share?d=${encodeURIComponent(encoded)}`;
}

/**
 * 서버에 플랜을 저장하고 짧은 링크(/s/{id})를 만든다.
 * 백엔드(Redis) 미가용 등 실패 시 레거시 임베드 URL로 폴백한다.
 */
export async function resolveShareUrl(plan: TravelPlan): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (res.ok) {
      const { id } = await res.json();
      if (id) return `${base}/s/${id}`;
    }
  } catch {
    // 폴백으로 진행
  }
  return buildEmbeddedShareUrl(plan);
}

export async function sharePlan(plan: TravelPlan): Promise<ShareOutcome> {
  const url = await resolveShareUrl(plan);

  // 1) Web Share API (모바일 우선)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: `여행 플랜 - ${plan.region.displayName}`, url });
      return { result: 'shared', url };
    } catch (e) {
      // AbortError만 "사용자가 공유 시트를 닫음"으로 간주해 조용히 종료.
      // NotAllowedError(삼성인터넷 등 공유 차단) 등 나머지는 반드시 클립보드로 폴백.
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { result: 'cancelled', url };
      }
    }
  }

  // 2) 클립보드 복사
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { result: 'copied', url };
    }
  } catch {
    // 폴백 계속
  }

  // 3) 최후 폴백: 호출부에서 링크를 직접 노출
  return { result: 'error', url };
}
