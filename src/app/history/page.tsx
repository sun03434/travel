'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TravelPlan } from '@/types/plan';
import { listPlans, deletePlan, clearAllPlans } from '@/lib/storage';
import { getDayCount } from '@/lib/utils';

export default function HistoryPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<TravelPlan[]>([]);

  useEffect(() => {
    setPlans(listPlans());
  }, []);

  function handleDelete(id: string) {
    deletePlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  function handleClear() {
    if (!confirm('저장된 모든 플랜을 삭제할까요?')) return;
    clearAllPlans();
    setPlans([]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline mb-0.5">
              ← 플래너로 돌아가기
            </button>
            <h1 className="text-base font-bold text-gray-900">내 플랜 목록</h1>
          </div>
          {plans.length > 0 && (
            <button
              onClick={handleClear}
              className="text-sm text-red-500 hover:text-red-700"
            >
              전체 삭제
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {plans.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">✈️</p>
            <p className="text-base font-medium">저장된 플랜이 없습니다.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors"
            >
              새 플랜 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const dayCount = getDayCount(plan.period.startDate, plan.period.endDate);
              const nightCount = dayCount - 1;
              const hasSchedule = plan.schedule.length > 0;
              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3"
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => router.push(`/schedule/${plan.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">
                        {plan.region.displayName}
                      </span>
                      {hasSchedule && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          일정 완료
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {plan.period.startDate} ~ {plan.period.endDate}
                      {nightCount > 0 ? ` · ${nightCount}박${dayCount}일` : ' · 당일치기'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      여행지 {plan.wishlist.attractions.length}곳 ·
                      음식점 {plan.wishlist.restaurants.length}곳 ·
                      숙소 {plan.wishlist.lodgings.length}곳
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 p-1"
                    aria-label="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
