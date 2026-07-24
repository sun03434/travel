'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Region, TravelPeriod, WishPlace, WishLodging, KakaoPlace, PlaceCategory, TravelPlan, ScheduledDay, ScheduledSlot } from '@/types/plan';
import { generateId, getDatesInRange, getDayLabel, addMinutesToTime } from '@/lib/utils';
import { savePlan } from '@/lib/storage';
import RegionPicker from '@/components/planner/RegionPicker';
import PeriodPicker from '@/components/planner/PeriodPicker';
import PlaceSearch from '@/components/planner/PlaceSearch';
import WishlistPanel from '@/components/planner/WishlistPanel';
import LodgingForm from '@/components/planner/LodgingForm';
import { kakaoPlaceToWishPlace } from '@/lib/kakao';

export default function PlannerPage() {
  const router = useRouter();

  const [region, setRegion] = useState<Region | null>(null);
  const [period, setPeriod] = useState<TravelPeriod | null>(null);
  const [attractions, setAttractions] = useState<WishPlace[]>([]);
  const [restaurants, setRestaurants] = useState<WishPlace[]>([]);
  const [lodgings, setLodgings] = useState<WishLodging[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = region && period;

  function handleAddPlace(kakaoPlace: KakaoPlace, category: PlaceCategory) {
    const base = kakaoPlaceToWishPlace(kakaoPlace, category);
    const place: WishPlace = { ...base, id: generateId() };
    if (category === 'attraction') {
      if (attractions.some((p) => p.kakaoId === kakaoPlace.id)) return;
      setAttractions((prev) => [...prev, place]);
    } else {
      if (restaurants.some((p) => p.kakaoId === kakaoPlace.id)) return;
      setRestaurants((prev) => [...prev, place]);
    }
  }

  function handleDeletePlace(id: string, listType: 'attraction' | 'restaurant') {
    if (listType === 'attraction') {
      setAttractions((prev) => prev.filter((p) => p.id !== id));
    } else {
      setRestaurants((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function handleNoteChange(id: string, listType: 'attraction' | 'restaurant', note: string) {
    if (listType === 'attraction') {
      setAttractions((prev) => prev.map((p) => (p.id === id ? { ...p, userNote: note } : p)));
    } else {
      setRestaurants((prev) => prev.map((p) => (p.id === id ? { ...p, userNote: note } : p)));
    }
  }

  function handleAddLodging(kakaoPlace: KakaoPlace, checkIn: string, checkOut: string) {
    const base = kakaoPlaceToWishPlace(kakaoPlace, 'attraction');
    const lodging: WishLodging = {
      id: generateId(),
      kakaoId: kakaoPlace.id,
      name: kakaoPlace.place_name,
      address: kakaoPlace.address_name,
      roadAddress: kakaoPlace.road_address_name,
      lat: parseFloat(kakaoPlace.y),
      lng: parseFloat(kakaoPlace.x),
      kakaoMapUrl: kakaoPlace.place_url,
      checkInDate: checkIn,
      checkOutDate: checkOut,
    };
    setLodgings((prev) => [...prev, lodging]);
  }

  function handleDeleteLodging(id: string) {
    setLodgings((prev) => prev.filter((l) => l.id !== id));
  }

  function handleLodgingDateChange(id: string, checkIn: string, checkOut: string) {
    setLodgings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, checkInDate: checkIn, checkOutDate: checkOut } : l))
    );
  }

  // AI 없이 빈 틀만 생성: 기간대로 날짜별 빈 슬롯 1개씩 + 등록한 장소는 보관함에 담아 수동 배치
  function handleManualSkeleton() {
    if (!region || !period) return;
    const planId = generateId();
    const dates = getDatesInRange(period.startDate, period.endDate);
    const schedule: ScheduledDay[] = dates.map((date, idx) => {
      const start = idx === 0 ? (period.startTime || '09:00') : '09:00';
      const slot: ScheduledSlot = {
        id: generateId(),
        time: start,
        endTime: addMinutesToTime(start, 90),
        type: 'empty',
      };
      return { date, dayLabel: getDayLabel(date, idx), slots: [slot], naverRouteUrl: '' };
    });
    const plan: TravelPlan = {
      id: planId,
      createdAt: new Date().toISOString(),
      region,
      period,
      wishlist: { attractions, restaurants, lodgings },
      stash: [...attractions, ...restaurants, ...lodgings],
      schedule,
    };
    savePlan(plan);
    router.push(`/schedule/${planId}`);
  }

  async function handleGenerate() {
    if (!region || !period) return;
    setGenerating(true);
    setError(null);

    const planId = generateId();
    const plan = {
      id: planId,
      createdAt: new Date().toISOString(),
      region,
      period,
      wishlist: { attractions, restaurants, lodgings },
      schedule: [],
    };

    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error('일정 생성에 실패했습니다.');
      const { schedule } = await res.json();
      const completedPlan = { ...plan, schedule, generatedAt: new Date().toISOString() };
      savePlan(completedPlan);
      router.push(`/schedule/${planId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">여행 플래너</h1>
            <p className="text-xs text-gray-500">AI 동선 최적화 또는 빈 틀에 직접 작성</p>
          </div>
          <a href="/history" className="text-sm text-blue-600 hover:underline">내 플랜 목록</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Section 1: 기본 정보 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">여행 기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">여행 지역</p>
              <RegionPicker
                value={region ? { province: region.province, city: region.city } : null}
                onChange={setRegion}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">여행 일정</p>
              <PeriodPicker value={period} onChange={setPeriod} />
            </div>
          </div>
        </section>

        {/* Section 2: 장소 검색 + 위시리스트 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">가고 싶은 여행지 · 음식점</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-3">카카오 지도 데이터 기반 검색</p>
              <PlaceSearch
                regionLat={region?.lat ?? 37.5665}
                regionLng={region?.lng ?? 126.978}
                regionName={region?.displayName ?? ''}
                onAdd={handleAddPlace}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-3">등록된 장소 목록</p>
              <WishlistPanel
                attractions={attractions}
                restaurants={restaurants}
                onDelete={handleDeletePlace}
                onNoteChange={handleNoteChange}
              />
            </div>
          </div>
        </section>

        {/* Section 3: 숙소 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">숙소</h2>
          <p className="text-sm text-gray-500 mb-3">숙소를 등록하면 동선의 기점으로 활용됩니다.</p>
          <LodgingForm
            regionLat={region?.lat ?? 37.5665}
            regionLng={region?.lng ?? 126.978}
            regionName={region?.displayName ?? ''}
            travelStartDate={period?.startDate ?? ''}
            travelEndDate={period?.endDate ?? ''}
            lodgings={lodgings}
            onAdd={handleAddLodging}
            onDelete={handleDeleteLodging}
            onDateChange={handleLodgingDateChange}
          />
        </section>

        {/* Generate CTA */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 py-4 px-4 -mx-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              {!region && '지역을 선택해주세요'}
              {region && !period && '여행 일정을 입력해주세요'}
              {region && period && (
                <span>
                  <span className="font-medium text-gray-800">{region.displayName}</span>
                  {' · '}
                  <span className="font-medium text-gray-800">
                    {period.startDate} ~ {period.endDate}
                  </span>
                  {' · '}여행지 {attractions.length}곳 · 음식점 {restaurants.length}곳
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleManualSkeleton}
                disabled={!canGenerate || generating}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-center"
                title="AI 없이 빈 일정 틀만 만들고 직접 작성합니다"
              >
                ✏️ 직접 짜기
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors min-w-[140px] text-center"
              >
                {generating ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    일정 생성 중…
                  </span>
                ) : (
                  '✨ AI 일정 생성'
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-center text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </main>
    </div>
  );
}
