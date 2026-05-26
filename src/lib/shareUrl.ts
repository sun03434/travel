import type { TravelPlan } from '@/types/plan';

export function encodePlan(plan: TravelPlan): string {
  const json = JSON.stringify(plan);
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
  return `${base}/share?d=${encoded}`;
}

export async function sharePlan(plan: TravelPlan): Promise<'shared' | 'copied'> {
  const url = buildShareUrl(plan);
  if (navigator.share) {
    await navigator.share({ title: `여행 플랜 - ${plan.region.displayName}`, url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
