'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import type { TravelPlan, ScheduledSlot, WishPlace } from '@/types/plan';
import { decodePlan } from '@/lib/shareUrl';
import { savePlan, getPlan } from '@/lib/storage';
import { buildNaverRouteUrl } from '@/lib/naverRoute';
import { weatherCodeToDescription, weatherCodeToEmoji } from '@/lib/utils';
import DayTimeline from '@/components/schedule/DayTimeline';

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = searchParams.get('d');
    if (!d) { setError(true); return; }

    const decoded = decodePlan(d);
    if (!decoded) { setError(true); return; }

    // Rebuild naverRouteUrl for each day
    const enriched = {
      ...decoded,
      schedule: decoded.schedule.map((day) => ({
        ...day,
        naverRouteUrl: buildNaverRouteUrl(day.slots),
      })),
    };
    setPlan(enriched);

    // Auto-save
    if (!getPlan(enriched.id)) {
      savePlan(enriched);
      setSaved(true);
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-gray-500">유효하지 않은 공유 링크입니다.</p>
          <button onClick={() => router.push('/')} className="mt-4 text-blue-600 text-sm hover:underline">
            플래너로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">{plan.region.displayName} 여행</h1>
            <p className="text-xs text-gray-500">{plan.period.startDate} ~ {plan.period.endDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">저장됨</span>
            )}
            <button
              onClick={() => router.push(`/schedule/${plan.id}`)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              내 플래너에서 열기
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {plan.schedule.map((day) => (
          <DayTimeline
            key={day.date}
            day={day}
            onRequestRecommend={() => {}}
          />
        ))}
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
