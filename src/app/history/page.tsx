'use client';

import { useEffect, useState } from 'react';
import { Guide } from '@/types/place';
import { loadHistory, deleteGuide, clearHistory } from '@/lib/storage';
import { allRegions } from '@/data/regions';
import { memberOptions } from '@/data/members';
import Link from 'next/link';

const durationLabels: Record<string, string> = {
  day: '당일치기',
  '1n2d': '1박 2일',
  '2n3d': '2박 3일',
  '3n4d': '3박 4일',
  '4n_plus': '4박 이상',
};

const categoryLabels: Record<string, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  lodging: '숙소',
};

export default function HistoryPage() {
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    setGuides(loadHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteGuide(id);
    setGuides(loadHistory());
  };

  const handleClear = () => {
    if (confirm('모든 가이드 기록을 삭제할까요?')) {
      clearHistory();
      setGuides([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="font-bold text-gray-800">✈️ 여행 가이드</span>
          </Link>
          {guides.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-600"
            >
              전체 삭제
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📁 내 가이드 기록</h1>

        {guides.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="text-gray-500 mb-2">아직 만든 가이드가 없어요.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
            >
              ✨ 첫 가이드 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {guides.map((guide) => {
              const regionLabel =
                allRegions.find((r) => r.id === guide.inputs.region)?.label ?? guide.inputs.region;
              const memberInfo = memberOptions.find((m) => m.id === guide.inputs.member);
              const totalPlaces = guide.plans[0]?.days.reduce((acc, d) => acc + d.slots.length, 0) ?? 0;

              return (
                <div
                  key={guide.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <Link
                    href={`/guide/${guide.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{memberInfo?.emoji ?? '👥'}</span>
                        <div>
                          <p className="font-semibold text-gray-800">
                            📍 {regionLabel}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(guide.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-300 mt-1"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                        {memberInfo?.label ?? guide.inputs.member}
                      </span>
                      <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                        {durationLabels[guide.inputs.duration] ?? guide.inputs.duration}
                      </span>
                      {guide.inputs.categories.map((c) => (
                        <span key={c} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {categoryLabels[c]}
                        </span>
                      ))}
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        {totalPlaces}곳
                      </span>
                    </div>
                  </Link>
                  <div className="px-4 pb-3 flex justify-end">
                    <button
                      onClick={() => handleDelete(guide.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
