'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Guide } from '@/types/place';
import TimelineView from '@/components/guide/TimelineView';
import ShareBar from '@/components/guide/ShareBar';
import { allRegions } from '@/data/regions';
import { memberOptions } from '@/data/members';
import Link from 'next/link';
import { loadHistory, saveGuide } from '@/lib/storage';

const durationLabels: Record<string, string> = {
  day: '당일치기',
  '1n2d': '1박 2일',
  '2n3d': '2박 3일',
  '3n4d': '3박 4일',
  '4n_plus': '4박 이상',
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
  const [addingPlan, setAddingPlan] = useState(false);
  const [addPlanError, setAddPlanError] = useState('');

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

  const PLAN_LABELS = ['A', 'B', 'C'];

  const handleAddAlternative = async () => {
    if (!guide.blogContext || addingPlan || guide.plans.length >= 3) return;
    setAddingPlan(true);
    setAddPlanError('');
    try {
      const planLabel = PLAN_LABELS[guide.plans.length] ?? 'B';
      const res = await fetch('/api/guide/alternative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: guide.inputs,
          blogContext: guide.blogContext,
          existingPlanNames: guide.plans.map((p) => p.name),
          planLabel,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddPlanError(data.error ?? '생성 실패');
        return;
      }
      const { plan } = await res.json();
      const updatedGuide = { ...guide, plans: [...guide.plans, plan] };
      setGuide(updatedGuide);
      saveGuide(updatedGuide);
      setPlanIdx(updatedGuide.plans.length - 1);
    } catch {
      setAddPlanError('네트워크 오류가 발생했습니다.');
    } finally {
      setAddingPlan(false);
    }
  };

  const currentPlan = guide.plans[planIdx] ?? guide.plans[0];
  const regionLabel = allRegions.find((r) => r.id === guide.inputs.region)?.label ?? guide.inputs.region;
  const memberInfo = memberOptions.find((m) => m.id === guide.inputs.member);
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
          <ShareBar guide={guide} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
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
            {guide.inputs.themes.map((t) => (
              <span key={t} className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium">
                {themeLabels[t]}
              </span>
            ))}
          </div>

        </div>

        {/* 플랜 선택 탭 */}
        {guide.plans.length > 1 && (
          <div className="mb-4">
            <div className={`grid gap-2 ${guide.plans.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
          </div>
        )}

        {/* 다른 콘셉트 추가 */}
        {guide.blogContext && guide.plans.length < 3 && (
          <div className="mb-4">
            <button
              onClick={handleAddAlternative}
              disabled={addingPlan}
              className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addingPlan ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  다른 콘셉트 생성 중...
                </>
              ) : (
                <>✨ 다른 콘셉트로 보기</>
              )}
            </button>
            {addPlanError && <p className="text-xs text-red-500 mt-1 text-center">{addPlanError}</p>}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <TimelineView days={currentPlan.days} inputs={guide.inputs} />
        </div>

        {guide.sourceBlogUrls && guide.sourceBlogUrls.length > 0 && (
          <details className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <summary className="px-5 py-3.5 text-sm font-medium text-gray-600 cursor-pointer select-none flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                <path d="M14 3v2H7v14h10v-3h2v4a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1h8zm7 7l-4 4-1.4-1.4L17.2 11H10V9h7.2l-1.6-1.6L17 6l4 4z"/>
              </svg>
              참고한 블로그 {guide.sourceBlogUrls.length}개
            </summary>
            <ul className="px-5 pb-4 space-y-2 border-t border-gray-50 pt-3">
              {guide.sourceBlogUrls.map((blog, i) => (
                <li key={i}>
                  <a
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 hover:underline line-clamp-1"
                  >
                    {blog.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

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
