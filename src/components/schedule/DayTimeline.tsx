'use client';

import type { ScheduledDay, ScheduledSlot, WishPlace } from '@/types/plan';
import { weatherCodeToEmoji } from '@/lib/utils';
import SlotCard from './SlotCard';
import RecommendButton from './RecommendButton';

interface DayTimelineProps {
  day: ScheduledDay;
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onRecommendSelect?: (slot: ScheduledSlot, place: WishPlace) => void;
  onReorderSlot?: (dayDate: string, slotId: string, direction: 'up' | 'down') => void;
  region?: string;
  regionLat?: number;
  regionLng?: number;
  allSlots?: ScheduledSlot[];
}

export default function DayTimeline({
  day,
  onRequestRecommend,
  onRecommendSelect,
  onReorderSlot,
  region = '',
  regionLat = 37.5,
  regionLng = 127.0,
  allSlots = [],
}: DayTimelineProps) {
  const { dayLabel, weather, naverRouteUrl, slots } = day;

  function getAdjacentPlaces(slot: ScheduledSlot) {
    const allPlaced = allSlots.filter((s) => s.place);
    const currentIdx = allPlaced.findIndex((s) => s.id === slot.id);
    const prevSlot = currentIdx > 0 ? allPlaced[currentIdx - 1] : null;
    const nextSlot = currentIdx >= 0 && currentIdx < allPlaced.length - 1 ? allPlaced[currentIdx + 1] : null;

    // Fallback: check within same day
    const dayPlaced = slots.filter((s) => s.place && s.id !== slot.id);
    const slotIdx = slots.findIndex((s) => s.id === slot.id);
    const prevDayPlaced = dayPlaced.filter((s) => slots.indexOf(s) < slotIdx).at(-1);
    const nextDayPlaced = dayPlaced.find((s) => slots.indexOf(s) > slotIdx);

    const prev = prevSlot ?? prevDayPlaced ?? null;
    const next = nextSlot ?? nextDayPlaced ?? null;

    return {
      prevPlace: prev?.place ? { name: prev.place.name, lat: prev.place.lat, lng: prev.place.lng } : undefined,
      nextPlace: next?.place ? { name: next.place.name, lat: next.place.lat, lng: next.place.lng } : undefined,
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

          {naverRouteUrl && naverRouteUrl !== 'https://map.naver.com' && (
            <a
              href={naverRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <span>🗺️</span>
              <span>네이버 지도로 보기</span>
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
              const isMovable = slot.type !== 'empty' && slot.type !== 'lodging' && slot.place;
              const prevIsMovable = idx > 0 && slots[idx - 1].type !== 'lodging';
              const nextIsMovable = idx < slots.length - 1 && slots[idx + 1].type !== 'lodging';
              return (
                <div key={slot.id}>
                  <SlotCard
                    slot={slot}
                    onRequestRecommend={onRequestRecommend}
                    onMoveUp={isMovable && prevIsMovable && onReorderSlot ? () => onReorderSlot(day.date, slot.id, 'up') : undefined}
                    onMoveDown={isMovable && nextIsMovable && onReorderSlot ? () => onReorderSlot(day.date, slot.id, 'down') : undefined}
                  />
                  {slot.type === 'empty' && onRecommendSelect && (
                    <div className="mt-2 ml-1">
                      <RecommendButton
                        slot={slot}
                        dayDate={day.date}
                        region={region}
                        regionLat={regionLat}
                        regionLng={regionLng}
                        {...getAdjacentPlaces(slot)}
                        onSelect={(place) => onRecommendSelect(slot, place)}
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
