'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TravelPlan, ScheduledSlot, WishPlace, WishLodging, ScheduledDay } from '@/types/plan';
import { getPlan, savePlan } from '@/lib/storage';
import { buildNaverAppRouteUrl, buildNaverWebRouteUrl } from '@/lib/naverRoute';
import { sharePlan } from '@/lib/shareUrl';
import { generateId, weatherCodeToDescription, weatherCodeToEmoji, slotGroup } from '@/lib/utils';
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
          s.id === slot.id ? { ...s, type: 'ai_fill' as const, place } : s
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

  function handleReorderSlot(_dayDate: string, slotId: string, direction: 'up' | 'down') {
    if (!plan) return;

    // Flat list across all days
    const flat: { dayIdx: number; slotIdx: number; slot: ScheduledSlot }[] = [];
    plan.schedule.forEach((day, di) =>
      day.slots.forEach((slot, si) => flat.push({ dayIdx: di, slotIdx: si, slot }))
    );

    const curFlatIdx = flat.findIndex((f) => f.slot.id === slotId);
    if (curFlatIdx === -1) return;

    const group = slotGroup(flat[curFlatIdx].slot);

    // 같은 카테고리 그룹(food↔food, travel↔travel)인 가장 가까운 슬롯 탐색
    let tgtFlatIdx = direction === 'up' ? curFlatIdx - 1 : curFlatIdx + 1;
    while (tgtFlatIdx >= 0 && tgtFlatIdx < flat.length && slotGroup(flat[tgtFlatIdx].slot) !== group) {
      tgtFlatIdx += direction === 'up' ? -1 : 1;
    }
    if (tgtFlatIdx < 0 || tgtFlatIdx >= flat.length) return;
    if (slotGroup(flat[tgtFlatIdx].slot) !== group) return;

    const a = flat[curFlatIdx];
    const b = flat[tgtFlatIdx];

    const affectedDays = new Set([a.dayIdx, b.dayIdx]);

    const updatedSchedule = plan.schedule.map((day, di) => {
      const newSlots = day.slots.map((slot, si) => {
        if (di === a.dayIdx && si === a.slotIdx)
          return { ...slot, place: b.slot.place, type: b.slot.type, warning: undefined };
        if (di === b.dayIdx && si === b.slotIdx)
          return { ...slot, place: a.slot.place, type: a.slot.type, warning: undefined };
        return slot;
      });
      if (!affectedDays.has(di)) return { ...day, slots: newSlots };
      return {
        ...day,
        slots: newSlots,
        naverAppRouteUrl: buildNaverAppRouteUrl(newSlots),
      };
    });

    const updated = { ...plan, schedule: updatedSchedule };
    savePlan(updated);
    setPlan(updated);
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
        const newSlots = d.slots.map((s) =>
          s.id === slotId ? { ...s, type: placeType, place, warning: undefined } : s
        );
        const changed = newSlots.some((s, i) => s !== d.slots[i]);
        return { ...d, slots: newSlots, ...(changed ? { naverAppRouteUrl: buildNaverAppRouteUrl(newSlots) } : {}) };
      }),
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
        {plan.schedule.map((day, dayIdx) => (
          <DayTimeline
            key={day.date}
            day={day}
            dayIndex={dayIdx}
            totalDays={plan.schedule.length}
            onRequestRecommend={() => {}}
            onRecommendSelect={handleRecommendSelect}
            onReorderSlot={handleReorderSlot}
            onClearToStash={handleClearToStash}
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
