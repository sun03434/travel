'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TravelPlan, ScheduledSlot, WishPlace, WishLodging, ScheduledDay, KakaoPlace, PlaceCategory } from '@/types/plan';
import { getPlan, savePlan } from '@/lib/storage';
import { buildNaverAppRouteUrl, buildNaverWebRouteUrl } from '@/lib/naverRoute';
import { sharePlan } from '@/lib/shareUrl';
import { generateId, weatherCodeToDescription, sortSlotsByTime, addMinutesToTime, getClosedDayWarning } from '@/lib/utils';
import { kakaoPlaceToWishPlace } from '@/lib/kakao';
import DayTimeline from '@/components/schedule/DayTimeline';
import StashPanel from '@/components/schedule/StashPanel';

async function fetchWeather(lat: number, lng: number, dates: string[]) {
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FSeoul&start_date=${startDate}&end_date=${endDate}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.daily as {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weathercode: number[];
    };
  } catch {
    return null;
  }
}

async function fetchTravelTimes(schedule: ScheduledDay[]) {
  const segments: { fromLat: number; fromLng: number; toLat: number; toLng: number }[] = [];
  const slotRefs: { dayIdx: number; slotIdx: number }[] = [];

  schedule.forEach((day, di) => {
    const placedSlots = day.slots.filter((s) => s.place);
    for (let i = 1; i < placedSlots.length; i++) {
      const prev = placedSlots[i - 1].place!;
      const curr = placedSlots[i].place!;
      segments.push({ fromLat: prev.lat, fromLng: prev.lng, toLat: curr.lat, toLng: curr.lng });
      slotRefs.push({ dayIdx: di, slotIdx: i });
    }
  });

  if (segments.length === 0) return schedule;

  try {
    const res = await fetch('/api/route/duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    });
    if (!res.ok) return schedule;
    const { durations } = await res.json();

    const updated = schedule.map((day) => ({ ...day, slots: [...day.slots] }));
    slotRefs.forEach(({ dayIdx, slotIdx }, i) => {
      const day = updated[dayIdx];
      const placedSlots = day.slots.filter((s) => s.place);
      if (placedSlots[slotIdx]) {
        placedSlots[slotIdx] = { ...placedSlots[slotIdx], travelMinFromPrev: durations[i] };
      }
    });
    return updated;
  } catch {
    return schedule;
  }
}

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  useEffect(() => {
    const loaded = getPlan(id);
    if (!loaded) { router.push('/'); return; }

    // Enrich schedule: naver route URLs + weather + travel times
    async function enrich(p: TravelPlan) {
      let schedule: import('@/types/plan').ScheduledDay[] = p.schedule.map((day) => ({
        ...day,
        naverRouteUrl: buildNaverWebRouteUrl(day.slots),
        naverAppRouteUrl: buildNaverAppRouteUrl(day.slots),
      }));

      // Weather
      const dates = schedule.map((d) => d.date);
      const weather = await fetchWeather(p.region.lat, p.region.lng, dates);
      if (weather) {
        schedule = schedule.map((day, idx) => {
          const wCode = weather.weathercode[idx] ?? 0;
          return {
            ...day,
            weather: {
              maxTemp: Math.round(weather.temperature_2m_max[idx] ?? 0),
              minTemp: Math.round(weather.temperature_2m_min[idx] ?? 0),
              weatherCode: wCode,
              description: weatherCodeToDescription(wCode),
            },
          };
        });
      }

      // Travel times
      schedule = await fetchTravelTimes(schedule);

      const enriched = { ...p, schedule };
      savePlan(enriched);
      setPlan(enriched);
    }

    enrich(loaded);
  }, [id, router]);

  function handleRecommendSelect(slot: ScheduledSlot, place: WishPlace) {
    if (!plan) return;
    const updated: TravelPlan = {
      ...plan,
      schedule: plan.schedule.map((day) => {
        const newSlots = day.slots.map((s) =>
          s.id === slot.id
            ? { ...s, type: 'ai_fill' as const, place, warning: getClosedDayWarning(place, day.date) }
            : s
        );
        const changed = newSlots.some((s) => s.id === slot.id);
        return {
          ...day,
          slots: newSlots,
          ...(changed ? { naverAppRouteUrl: buildNaverAppRouteUrl(newSlots) } : {}),
        };
      }),
    };
    savePlan(updated);
    setPlan(updated);
  }

  // 슬롯을 시간순 정렬하고 경로 URL을 재생성한다. travelMinFromPrev는 초기화 후 commit에서 재계산된다.
  function rebuildDay(day: ScheduledDay): ScheduledDay {
    const slots = sortSlotsByTime(day.slots).map((s) => ({ ...s, travelMinFromPrev: undefined }));
    return {
      ...day,
      slots,
      naverRouteUrl: buildNaverWebRouteUrl(slots),
      naverAppRouteUrl: buildNaverAppRouteUrl(slots),
    };
  }

  // 구조 변경(추가/삭제/시간·날짜 편집)을 저장하고 이동시간을 다시 계산한다.
  async function commitStructural(updated: TravelPlan) {
    savePlan(updated);
    setPlan(updated);
    const schedule = await fetchTravelTimes(updated.schedule);
    const withTimes = { ...updated, schedule };
    savePlan(withTimes);
    setPlan(withTimes);
  }

  function handleUpdateSlotTime(dayDate: string, slotId: string, date: string, time: string, endTime: string) {
    if (!plan) return;
    const srcDay = plan.schedule.find((d) => d.date === dayDate);
    const slot = srcDay?.slots.find((s) => s.id === slotId);
    if (!slot) return;

    // 날짜 이동은 기존 일자로만 허용 (여행 기간 밖 날짜 방지)
    const targetDate = plan.schedule.some((d) => d.date === date) ? date : dayDate;
    const updatedSlot: ScheduledSlot = {
      ...slot,
      time,
      endTime,
      warning: slot.place ? getClosedDayWarning(slot.place, targetDate) : undefined,
    };

    const schedule = plan.schedule.map((d) => {
      if (d.date === dayDate && targetDate === dayDate) {
        return rebuildDay({ ...d, slots: d.slots.map((s) => (s.id === slotId ? updatedSlot : s)) });
      }
      if (d.date === dayDate) {
        return rebuildDay({ ...d, slots: d.slots.filter((s) => s.id !== slotId) });
      }
      if (d.date === targetDate) {
        return rebuildDay({ ...d, slots: [...d.slots, updatedSlot] });
      }
      return d;
    });

    commitStructural({ ...plan, schedule });
  }

  function handleAddSlot(dayDate: string) {
    if (!plan) return;
    const day = plan.schedule.find((d) => d.date === dayDate);
    if (!day) return;
    // 마지막 슬롯 종료 시간 뒤에 배치 (없으면 09:00)
    const lastEnd = day.slots.reduce((max, s) => (s.endTime > max ? s.endTime : max), '');
    const start = lastEnd || '09:00';
    const newSlot: ScheduledSlot = {
      id: generateId(),
      time: start,
      endTime: addMinutesToTime(start, 90),
      type: 'empty',
    };
    const schedule = plan.schedule.map((d) =>
      d.date === dayDate ? rebuildDay({ ...d, slots: [...d.slots, newSlot] }) : d
    );
    commitStructural({ ...plan, schedule });
  }

  function handleDeleteSlot(dayDate: string, slotId: string) {
    if (!plan) return;
    const schedule = plan.schedule.map((d) =>
      d.date === dayDate ? rebuildDay({ ...d, slots: d.slots.filter((s) => s.id !== slotId) }) : d
    );
    commitStructural({ ...plan, schedule });
  }

  function handleClearToStash(dayDate: string, slotId: string) {
    if (!plan) return;
    const day = plan.schedule.find((d) => d.date === dayDate);
    const slot = day?.slots.find((s) => s.id === slotId);
    if (!slot?.place) return;
    const place = slot.place;
    const updated: TravelPlan = {
      ...plan,
      stash: [...(plan.stash ?? []), place],
      schedule: plan.schedule.map((d) => {
        if (d.date !== dayDate) return d;
        const newSlots = d.slots.map((s) =>
          s.id === slotId ? { ...s, type: 'empty' as const, place: undefined, warning: undefined } : s
        );
        return { ...d, slots: newSlots, naverAppRouteUrl: buildNaverAppRouteUrl(newSlots) };
      }),
    };
    savePlan(updated);
    setPlan(updated);
  }

  function handlePlaceFromStash(place: WishPlace | WishLodging, dayDate: string, slotId: string) {
    if (!plan) return;
    const placeType = 'checkInDate' in place ? 'lodging' as const : 'wish' as const;
    const updated: TravelPlan = {
      ...plan,
      stash: (plan.stash ?? []).filter((p) => p.id !== place.id),
      schedule: plan.schedule.map((d) => {
        const warning = d.date === dayDate ? getClosedDayWarning(place, d.date) : undefined;
        const newSlots = d.slots.map((s) =>
          s.id === slotId ? { ...s, type: placeType, place, warning } : s
        );
        const changed = newSlots.some((s, i) => s !== d.slots[i]);
        return { ...d, slots: newSlots, ...(changed ? { naverAppRouteUrl: buildNaverAppRouteUrl(newSlots) } : {}) };
      }),
    };
    savePlan(updated);
    setPlan(updated);
  }

  function handleSearchSelect(dayDate: string, slotId: string, kakaoPlace: KakaoPlace, category: PlaceCategory) {
    if (!plan) return;
    const base = kakaoPlaceToWishPlace(kakaoPlace, category);
    const place: WishPlace = { ...base, id: generateId() };
    const listKey = category === 'restaurant' ? 'restaurants' : 'attractions';
    const alreadyInList = plan.wishlist[listKey].some((p) => p.kakaoId === kakaoPlace.id);

    const updated: TravelPlan = {
      ...plan,
      wishlist: alreadyInList ? plan.wishlist : {
        ...plan.wishlist,
        [listKey]: [...plan.wishlist[listKey], place],
      },
      schedule: plan.schedule.map((d) => {
        const newSlots = d.slots.map((s) =>
          s.id === slotId
            ? { ...s, type: 'wish' as const, place, warning: getClosedDayWarning(place, d.date) }
            : s
        );
        const changed = newSlots.some((s, i) => s !== d.slots[i]);
        return { ...d, slots: newSlots, ...(changed ? { naverAppRouteUrl: buildNaverAppRouteUrl(newSlots) } : {}) };
      }),
    };
    savePlan(updated);
    setPlan(updated);
  }

  function handleUpdateClosedDays(dayDate: string, slotId: string, closedDays: string[]) {
    if (!plan) return;
    const updated: TravelPlan = {
      ...plan,
      wishlist: {
        ...plan.wishlist,
        attractions: plan.wishlist.attractions.map((p) => {
          const slot = plan.schedule.flatMap((d) => d.slots).find((s) => s.id === slotId);
          return slot?.place && 'kakaoId' in slot.place && slot.place.kakaoId === p.kakaoId
            ? { ...p, closedDays }
            : p;
        }),
        restaurants: plan.wishlist.restaurants.map((p) => {
          const slot = plan.schedule.flatMap((d) => d.slots).find((s) => s.id === slotId);
          return slot?.place && 'kakaoId' in slot.place && slot.place.kakaoId === p.kakaoId
            ? { ...p, closedDays }
            : p;
        }),
      },
      schedule: plan.schedule.map((d) => ({
        ...d,
        slots: d.slots.map((s) => {
          if (s.id !== slotId || !s.place || !('category' in s.place)) return s;
          const updatedPlace = { ...s.place, closedDays };
          return {
            ...s,
            place: updatedPlace,
            warning: d.date === dayDate ? getClosedDayWarning(updatedPlace, d.date) : s.warning,
          };
        }),
      })),
    };
    savePlan(updated);
    setPlan(updated);
  }

  function handleRemoveFromStash(placeId: string) {
    if (!plan) return;
    const updated: TravelPlan = { ...plan, stash: (plan.stash ?? []).filter((p) => p.id !== placeId) };
    savePlan(updated);
    setPlan(updated);
  }

  async function handleShare() {
    if (!plan) return;
    const result = await sharePlan(plan);
    setShareStatus(result);
    setTimeout(() => setShareStatus('idle'), 3000);
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline mb-0.5 flex items-center gap-1">
              ← 플래너로 돌아가기
            </button>
            <h1 className="text-base font-bold text-gray-900">{plan.region.displayName} 여행</h1>
            <p className="text-xs text-gray-500">{plan.period.startDate} ~ {plan.period.endDate}</p>
          </div>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {shareStatus === 'idle' ? '🔗 공유' : shareStatus === 'copied' ? '✓ 복사됨' : '✓ 공유됨'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-20">
        {plan.schedule.map((day) => (
          <DayTimeline
            key={day.date}
            day={day}
            dayDates={plan.schedule.map((d) => ({ date: d.date, label: d.dayLabel }))}
            onRequestRecommend={() => {}}
            onRecommendSelect={handleRecommendSelect}
            onUpdateSlotTime={handleUpdateSlotTime}
            onAddSlot={handleAddSlot}
            onDeleteSlot={handleDeleteSlot}
            onClearToStash={handleClearToStash}
            onUpdateClosedDays={handleUpdateClosedDays}
            onSearchSelect={handleSearchSelect}
            region={plan.region.displayName}
            regionLat={plan.region.lat}
            regionLng={plan.region.lng}
            allSlots={plan.schedule.flatMap((d) => d.slots)}
          />
        ))}

        {plan.schedule.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p>생성된 일정이 없습니다.</p>
          </div>
        )}
      </main>

      <StashPanel
        stash={plan.stash ?? []}
        schedule={plan.schedule}
        onPlaceFromStash={handlePlaceFromStash}
        onRemoveFromStash={handleRemoveFromStash}
      />
    </div>
  );
}
