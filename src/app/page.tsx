'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RegionSelect from '@/components/form/RegionSelect';
import MemberSelect from '@/components/form/MemberSelect';
import DurationSelect from '@/components/form/DurationSelect';
import CategoryChecks from '@/components/form/CategoryChecks';
import ThemeChips from '@/components/form/ThemeChips';
import { Category, DurationKey, GuideInputs, MemberTag, Theme } from '@/types/place';
import { saveGuide } from '@/lib/storage';
import { allRegions } from '@/data/regions';
import { memberOptions } from '@/data/members';

type Step = 'region' | 'member' | 'duration' | 'categories' | 'themes' | 'extra';

const steps: { id: Step; label: string; emoji: string }[] = [
  { id: 'region', label: '지역', emoji: '📍' },
  { id: 'member', label: '멤버', emoji: '👥' },
  { id: 'duration', label: '기간', emoji: '📅' },
  { id: 'categories', label: '카테고리', emoji: '🗂️' },
  { id: 'themes', label: '테마', emoji: '✨' },
  { id: 'extra', label: '추가 정보', emoji: '💬' },
];

const durationLabels: Record<string, string> = {
  day: '당일치기',
  '1n2d': '1박 2일',
  '2n3d': '2박 3일',
  '3n4d': '3박 4일',
  '4n_plus': '4박 이상',
};

export default function HomePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('region');
  const [region, setRegion] = useState('');
  const [member, setMember] = useState<MemberTag | ''>('');
  const [duration, setDuration] = useState<DurationKey | ''>('');
  const [categories, setCategories] = useState<Category[]>(['attraction', 'restaurant', 'lodging']);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [extraRequest, setExtraRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  const canNext = () => {
    if (currentStep === 'region') return !!region;
    if (currentStep === 'member') return !!member;
    if (currentStep === 'duration') return !!duration;
    if (currentStep === 'categories') return categories.length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentIdx < steps.length - 1) {
      setCurrentStep(steps[currentIdx + 1].id);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentStep(steps[currentIdx - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!region || !member || !duration) {
      setError('지역, 멤버, 기간은 필수 입력 항목입니다.');
      return;
    }
    setLoading(true);
    setError('');

    const inputs: GuideInputs = {
      region,
      member: member as MemberTag,
      duration: duration as DurationKey,
      categories,
      themes,
      extraRequest: extraRequest || undefined,
    };

    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '가이드 생성에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      const guide = await res.json();
      saveGuide(guide);
      router.push(`/guide/${guide.id}`);
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = currentIdx === steps.length - 1;
  const regionLabel = region ? allRegions.find((r) => r.id === region)?.label : '';
  const memberLabel = member ? memberOptions.find((m) => m.id === member)?.label : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="font-bold text-gray-800">여행 가이드</span>
          </div>
          <a href="/history" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            내 가이드 보기
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">어디로 떠날까요? 🗺️</h1>
          <p className="text-gray-500">
            지역, 멤버, 기간을 선택하면 AI가 맞춤 여행 가이드를 만들어 드려요.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => { if (idx < currentIdx) setCurrentStep(step.id); }}
                className={`flex flex-col items-center gap-0.5 w-full text-xs transition-colors ${
                  idx < currentIdx ? 'text-indigo-600 cursor-pointer' : idx === currentIdx ? 'text-indigo-600' : 'text-gray-300'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                  idx < currentIdx ? 'bg-indigo-100 text-indigo-600' : idx === currentIdx ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-gray-100'
                }`}>
                  {idx < currentIdx ? '✓' : step.emoji}
                </span>
                <span className="hidden sm:block">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 transition-colors ${idx < currentIdx ? 'bg-indigo-300' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>{steps[currentIdx].emoji}</span>
            <span>{steps[currentIdx].label}</span>
            {currentStep === 'themes' || currentStep === 'extra' ? (
              <span className="text-sm font-normal text-gray-400">(선택)</span>
            ) : (
              <span className="text-sm font-normal text-red-400">*필수</span>
            )}
          </h2>

          {currentStep === 'region' && <RegionSelect value={region} onChange={setRegion} />}
          {currentStep === 'member' && <MemberSelect value={member} onChange={setMember} />}
          {currentStep === 'duration' && <DurationSelect value={duration} onChange={setDuration} />}
          {currentStep === 'categories' && <CategoryChecks value={categories} onChange={setCategories} />}
          {currentStep === 'themes' && <ThemeChips value={themes} onChange={setThemes} />}
          {currentStep === 'extra' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">추가 요청사항</label>
              <p className="text-xs text-gray-400 mb-2">특별한 조건이나 요구사항이 있으면 자유롭게 작성해주세요.</p>
              <textarea
                value={extraRequest}
                onChange={(e) => setExtraRequest(e.target.value)}
                placeholder="예: 채식주의자예요 / 아이가 5살이에요 / 예산이 많지 않아요 / 도보 위주로 다니고 싶어요"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm resize-none"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentIdx > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              ← 이전
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  AI가 블로그를 검색하고 있어요...
                </span>
              ) : '🗺️ 가이드 만들기'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음 →
            </button>
          )}
        </div>

        {/* Summary chips */}
        {(regionLabel || memberLabel || duration) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 flex flex-wrap gap-2">
            {regionLabel && <span className="bg-white px-2 py-1 rounded-lg border border-gray-200">📍 {regionLabel}</span>}
            {memberLabel && <span className="bg-white px-2 py-1 rounded-lg border border-gray-200">👥 {memberLabel}</span>}
            {duration && <span className="bg-white px-2 py-1 rounded-lg border border-gray-200">📅 {durationLabels[duration]}</span>}
          </div>
        )}

      </main>
    </div>
  );
}
