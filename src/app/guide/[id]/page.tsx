'use client';

import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Guide } from '@/types/place';
import TimelineView from '@/components/guide/TimelineView';
import ShareBar from '@/components/guide/ShareBar';
import { allRegions } from '@/data/regions';
import { memberOptions } from '@/data/members';
import Link from 'next/link';
import { loadHistory } from '@/lib/storage';

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

const themeLabels: Record<string, string> = {
  healing: '힐링',
  activity: '액티비티',
  culture: '문화·예술',
  night: '야경',
  hotplace: '핫플레이스',
  indoor: '실내(우천시)',
  shopping: '쇼핑',
  nature: '자연',
};

function GuideContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [planIdx, setPlanIdx] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setGuide(parsed);
        return;
      } catch {
        // fallback to localStorage
      }
    }
    const history: Guide[] = loadHistory();
    const found = history.find((g: Guide) => g.id === params.id);
    if (found) setGuide(found);
  }, [params.id, searchParams]);

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-500">가이드를 불러오는 중...</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const currentPlan = guide.plans[planIdx] ?? guide.plans[0];
  const regionLabel = allRegions.find((r) => r.id === guide.inputs.region)?.label ?? guide.inputs.region;
  const memberInfo = memberOptions.find((m) => m.id === guide.inputs.member);
  const totalPlaces = currentPlan.days.reduce((acc, d) => acc + d.slots.length, 0);

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
          <ShareBar guide={guide} contentRef={contentRef} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6" ref={contentRef}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold mb-1">📍 {regionLabel}</h1>
              <p className="text-indigo-100 text-sm">
                {new Date(guide.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })} 생성
              </p>
            </div>
            <span className="text-3xl">{memberInfo?.emoji ?? '👥'}</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
              {memberInfo?.label ?? guide.inputs.member}
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
              {durationLabels[guide.inputs.duration] ?? guide.inputs.duration}
            </span>
            {guide.inputs.categories.map((c) => (
              <span key={c} className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
                {categoryLabels[c]}
              </span>
            ))}
            {guide.inputs.themes.map((t) => (
              <span key={t} className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
                {themeLabels[t]}
              </span>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/20 text-xs text-indigo-100">
            {currentPlan.name} · 총 {totalPlaces}개 장소 · {currentPlan.days.length}일 코스
          </div>
        </div>

        {/* 플랜 선택 */}
        {guide.plans.length > 1 && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              {guide.plans.map((plan, idx) => (
                <button
                  key={idx}
                  onClick={() => setPlanIdx(idx)}
                  className={`py-2 px-1 rounded-full text-sm font-medium transition-all border ${
                    planIdx === idx
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {plan.name.split(':')[0].trim()}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
              {currentPlan.name.split(':')[1]?.trim() ?? currentPlan.name}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <TimelineView days={currentPlan.days} inputs={guide.inputs} />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
          >
            <span>✨</span>
            <span>새 가이드 만들기</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    }>
      <GuideContent />
    </Suspense>
  );
}
