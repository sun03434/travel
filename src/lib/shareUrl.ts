import type { TravelPlan, ScheduledDay } from '@/types/plan';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error';

/**
 * 공유 URL 크기를 줄이기 위해 공유 뷰에서 다시 계산되는 파생 필드를 제거한다.
 * (긴 네이버 경로 URL 문자열이 URL 길이의 주범 → share 페이지에서 재생성)
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

export function buildShareUrl(plan: TravelPlan): string {
  const encoded = encodePlan(plan);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  // base64의 +, /, = 는 쿼리스트링에서 깨질 수 있으므로 반드시 URL 인코딩
  return `${base}/share?d=${encodeURIComponent(encoded)}`;
}

export async function sharePlan(plan: TravelPlan): Promise<ShareResult> {
  const url = buildShareUrl(plan);

  // 1) Web Share API (모바일 우선). 실패해도 클립보드로 폴백한다.
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: `여행 플랜 - ${plan.region.displayName}`, url });
      return 'shared';
    } catch (e) {
      // AbortError만 "사용자가 공유 시트를 닫음"으로 간주해 조용히 종료.
      // NotAllowedError(삼성인터넷 등에서 공유 차단 시 자주 발생) 등 나머지는 반드시 클립보드로 폴백.
      if (e instanceof DOMException && e.name === 'AbortError') {
        return 'cancelled';
      }
      // 그 외(NotAllowedError·페이로드 과대 등)는 아래 클립보드 폴백으로 진행
    }
  }

  // 2) 클립보드 복사
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    // 폴백 계속
  }

  // 3) 최후 폴백: 호출부에서 링크를 직접 노출하도록 error 반환
  return 'error';
}
