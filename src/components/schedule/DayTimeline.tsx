'use client';

import type { ScheduledDay, ScheduledSlot, WishPlace, KakaoPlace, PlaceCategory } from '@/types/plan';
import { weatherCodeToEmoji } from '@/lib/utils';
import SlotCard, { type DayDateOption } from './SlotCard';
import RecommendButton from './RecommendButton';

interface DayTimelineProps {
  day: ScheduledDay;
  dayDates?: DayDateOption[];
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onRecommendSelect?: (slot: ScheduledSlot, place: WishPlace) => void;
  onUpdateSlotTime?: (dayDate: string, slotId: string, date: string, time: string, endTime: string) => void;
  onAddSlot?: (dayDate: string) => void;
  onDeleteSlot?: (dayDate: string, slotId: string) => void;
  onClearToStash?: (dayDate: string, slotId: string) => void;
  onUpdateClosedDays?: (dayDate: string, slotId: string, closedDays: string[]) => void;
  onSearchSelect?: (dayDate: string, slotId: string, place: KakaoPlace, category: PlaceCategory) => void;
  region?: string;
  regionLat?: number;
  regionLng?: number;
  allSlots?: ScheduledSlot[];
}

export default function DayTimeline({
  day,
  dayDates,
  onRequestRecommend,
  onRecommendSelect,
  onUpdateSlotTime,
  onAddSlot,
  onDeleteSlot,
  onClearToStash,
  onUpdateClosedDays,
  onSearchSelect,
  region = '',
  regionLat = 37.5,
  regionLng = 127.0,
  allSlots = [],
}: DayTimelineProps) {
  const { dayLabel, weather, naverAppRouteUrl, slots } = day;

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
            {slots.map((slot) => (
              <div key={slot.id}>
                <SlotCard
                  slot={slot}
                  currentDate={day.date}
                  dayDates={dayDates}
                  onRequestRecommend={onRequestRecommend}
                  onUpdateTime={onUpdateSlotTime ? (date, time, endTime) => onUpdateSlotTime(day.date, slot.id, date, time, endTime) : undefined}
                  onDelete={onDeleteSlot ? () => onDeleteSlot(day.date, slot.id) : undefined}
                  onClearToStash={onClearToStash ? () => onClearToStash(day.date, slot.id) : undefined}
                  onUpdateClosedDays={onUpdateClosedDays ? (days) => onUpdateClosedDays(day.date, slot.id, days) : undefined}
                  onSearchSelect={onSearchSelect ? (place, cat) => onSearchSelect(day.date, slot.id, place, cat) : undefined}
                  regionName={region}
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
            ))}
          </div>
        )}

        {/* 슬롯 추가 */}
        {onAddSlot && (
          <button
            type="button"
            onClick={() => onAddSlot(day.date)}
            className="mt-3 w-full py-2.5 text-sm font-medium text-indigo-600 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
          >
            ＋ 슬롯 추가
          </button>
        )}
      </div>
    </div>
  );
}
