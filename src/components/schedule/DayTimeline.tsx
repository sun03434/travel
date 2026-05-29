'use client';

import type { ScheduledDay, ScheduledSlot, WishPlace } from '@/types/plan';
import { weatherCodeToEmoji, slotGroup } from '@/lib/utils';
import SlotCard from './SlotCard';
import RecommendButton from './RecommendButton';

interface DayTimelineProps {
  day: ScheduledDay;
  dayIndex?: number;
  totalDays?: number;
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onRecommendSelect?: (slot: ScheduledSlot, place: WishPlace) => void;
  onReorderSlot?: (dayDate: string, slotId: string, direction: 'up' | 'down') => void;
  onClearToStash?: (dayDate: string, slotId: string) => void;
  onUpdateClosedDays?: (dayDate: string, slotId: string, closedDays: string[]) => void;
  region?: string;
  regionLat?: number;
  regionLng?: number;
  allSlots?: ScheduledSlot[];
}

export default function DayTimeline({
  day,
  dayIndex = 0,
  totalDays = 1,
  onRequestRecommend,
  onRecommendSelect,
  onReorderSlot,
  onClearToStash,
  onUpdateClosedDays,
  region = '',
  regionLat = 37.5,
  regionLng = 127.0,
  allSlots = [],
}: DayTimelineProps) {
  const { dayLabel, weather, naverRouteUrl, naverAppRouteUrl, slots } = day;

  function getAdjacentPlaces(slot: ScheduledSlot) {
    // Find slot's position in full cross-day flat list
    const idx = allSlots.findIndex((s) => s.id === slot.id);
    const prev = idx > 0 ? (allSlots.slice(0, idx).reverse().find((s) => s.place) ?? null) : null;
    const next = idx >= 0 ? (allSlots.slice(idx + 1).find((s) => s.place) ?? null) : null;
    return {
      prevPlace: prev?.place ? { name: prev.place.name, lat: prev.place.lat, lng: prev.place.lng } : undefined,
      nextPlace: next?.place ? { name: next.place.name, lat: next.place.lat, lng: next.place.lng } : undefined,
      isNextLodging: next?.type === 'lodging',
    };
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base">{dayLabel}</h3>
            {weather && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg leading-none" role="img" aria-label={weather.description}>
                  {weatherCodeToEmoji(weather.weatherCode)}
                </span>
                <span className="text-sm text-gray-600">{weather.description}</span>
                <span className="text-sm text-gray-500">
                  <span className="text-red-500 font-medium">{weather.maxTemp}°</span>
                  {' / '}
                  <span className="text-blue-500 font-medium">{weather.minTemp}°</span>
                </span>
              </div>
            )}
          </div>

          {naverAppRouteUrl && (
            <a
              href={naverAppRouteUrl}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <span>🗺️</span>
              <span>앱으로 길찾기</span>
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {slots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">이 날은 일정이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {slots.map((slot, idx) => {
              const isLodgingSlot = slot.type === 'lodging' || !!(slot.place && 'checkInDate' in slot.place);
              const isMovable = !!(slot.type !== 'empty' && !isLodgingSlot && slot.place && onReorderSlot);
              const group = slotGroup(slot);
              // ▲: 이 슬롯 앞쪽에 같은 그룹 슬롯이 하나라도 있으면 활성화 (중간에 다른 그룹 슬롯 있어도 무시)
              const hasPrevSameGroup = slots.slice(0, idx).some((s) => slotGroup(s) === group);
              const canMoveUp = isMovable && (hasPrevSameGroup || dayIndex > 0);
              // ▼: 이 슬롯 뒤쪽에 같은 그룹 슬롯이 하나라도 있으면 활성화
              const hasNextSameGroup = slots.slice(idx + 1).some((s) => slotGroup(s) === group);
              const canMoveDown = isMovable && (hasNextSameGroup || dayIndex < totalDays - 1);
              return (
                <div key={slot.id}>
                  <SlotCard
                    slot={slot}
                    onRequestRecommend={onRequestRecommend}
                    onMoveUp={canMoveUp ? () => onReorderSlot!(day.date, slot.id, 'up') : undefined}
                    onMoveDown={canMoveDown ? () => onReorderSlot!(day.date, slot.id, 'down') : undefined}
                    onClearToStash={onClearToStash ? () => onClearToStash(day.date, slot.id) : undefined}
                    onUpdateClosedDays={onUpdateClosedDays ? (days) => onUpdateClosedDays(day.date, slot.id, days) : undefined}
                  />
                  {slot.type === 'empty' && onRecommendSelect && (
                    <div className="mt-2 ml-1">
                      <RecommendButton
                        slot={slot}
                        dayDate={day.date}
                        region={region}
                        regionLat={regionLat}
                        regionLng={regionLng}
                        onSelect={(place) => onRecommendSelect(slot, place)}
                        {...getAdjacentPlaces(slot)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
