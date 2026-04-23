'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Guide } from '@/types/place';
import { decodeGuide } from '@/lib/shareUrl';
import { saveGuide } from '@/lib/storage';
import TimelineView from '@/components/guide/TimelineView';
import MapView from '@/components/guide/MapView';
import ShareBar from '@/components/guide/ShareBar';
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

function SharedGuideContent() {
  const searchParams = useSearchParams();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map'>('timeline');

  useEffect(() => {
    const encoded = searchParams.get('data');
    if (!encoded) { setError(true); return; }
    const decoded = decodeGuide(encoded);
    if (!decoded) { setError(true); return; }
    setGuide(decoded);
    saveGuide(decoded);
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-gray-500">공유 링크가 유효하지 않습니다.</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            새 가이드 만들기
          </Link>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  const regionLabel = allRegions.find((r) => r.id === guide.inputs.region)?.label ?? guide.inputs.region;
  const memberInfo = memberOptions.find((m) => m.id === guide.inputs.member);
  const [planIdx, setPlanIdx] = useState(0);
  const currentPlan = guide.plans[planIdx] ?? guide.plans[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-800">✈️ 여행 가이드</Link>
          <ShareBar guide={guide} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-700 flex items-center gap-2">
          <span>🔗</span>
          <span>공유된 여행 가이드입니다. 내 기록에 자동으로 저장되었어요.</span>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold">📍 {regionLabel}</h1>
            <span className="text-3xl">{memberInfo?.emoji ?? '👥'}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
              {memberInfo?.label ?? guide.inputs.member}
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
              {durationLabels[guide.inputs.duration] ?? guide.inputs.duration}
            </span>
          </div>
        </div>

        <div className="flex bg-white rounded-xl border border-gray-100 p-1 mb-4 shadow-sm">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📋 타임라인
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'map' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📍 장소 목록
          </button>
        </div>

        {guide.plans.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {guide.plans.map((plan, idx) => (
              <button
                key={idx}
                onClick={() => setPlanIdx(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  planIdx === idx
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {activeTab === 'timeline' ? (
            <TimelineView days={currentPlan.days} inputs={guide.inputs} />
          ) : (
            <MapView days={currentPlan.days} inputs={guide.inputs} />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
            ✨ 나만의 가이드 만들기
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SharedGuidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    }>
      <SharedGuideContent />
    </Suspense>
  );
}
