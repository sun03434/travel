'use client';

import type { TravelPlan } from '@/types/plan';
import { useRouter } from 'next/navigation';
import DayTimeline from './DayTimeline';

export default function ReadonlyPlanView({ plan, saved }: { plan: TravelPlan; saved?: boolean }) {
  const router = useRouter();

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
