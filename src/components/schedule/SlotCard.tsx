'use client';

import { useState } from 'react';
import { ScheduledSlot, WishPlace, WishLodging, PlaceCategory, KakaoPlace } from '@/types/plan';
import { cn } from '@/lib/utils';
import SlotPlaceSearch from './SlotPlaceSearch';

const ALL_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export interface DayDateOption {
  date: string;
  label: string;
}

interface SlotCardProps {
  slot: ScheduledSlot;
  currentDate: string;
  dayDates?: DayDateOption[];
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onUpdateTime?: (date: string, time: string, endTime: string) => void;
  onDelete?: () => void;
  onClearToStash?: () => void;
  onUpdateClosedDays?: (closedDays: string[]) => void;
  onSearchSelect?: (place: KakaoPlace, category: PlaceCategory) => void;
  regionName?: string;
}

const categoryLabel: Record<PlaceCategory, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  cafe: '카페',
  shopping: '쇼핑',
};

const categoryBg: Record<PlaceCategory, string> = {
  attraction: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  cafe: 'bg-amber-100 text-amber-700',
  shopping: 'bg-pink-100 text-pink-700',
};

function isWishPlace(place: WishPlace | WishLodging): place is WishPlace {
  return 'category' in place;
}

function isWishLodging(place: WishPlace | WishLodging): place is WishLodging {
  return 'checkInDate' in place;
}

function TravelConnector({ minutes }: { minutes: number }) {
  if (minutes <= 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-1 my-1">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 whitespace-nowrap">🚗 약 {minutes}분</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

/** 시간(및 날짜) 표시 + 인라인 편집 + 슬롯 액션(보관함/삭제) 공통 행 */
function SlotTimeRow({
  slot,
  currentDate,
  dayDates = [],
  muted = false,
  canStash = false,
  onUpdateTime,
  onClearToStash,
  onDelete,
}: {
  slot: ScheduledSlot;
  currentDate: string;
  dayDates?: DayDateOption[];
  muted?: boolean;
  canStash?: boolean;
  onUpdateTime?: (date: string, time: string, endTime: string) => void;
  onClearToStash?: () => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(currentDate);
  const [draftStart, setDraftStart] = useState(slot.time);
  const [draftEnd, setDraftEnd] = useState(slot.endTime);
  const showDateSelect = dayDates.length > 1;

  function openEditor() {
    setDraftDate(currentDate);
    setDraftStart(slot.time);
    setDraftEnd(slot.endTime);
    setEditing(true);
  }

  if (editing && onUpdateTime) {
    return (
      <div className="mb-2 p-2.5 bg-white/80 rounded-xl border border-gray-200">
        {showDateSelect && (
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">날짜</label>
            <select
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            >
              {dayDates.map((d) => (
                <option key={d.date} value={d.date}>{d.label}</option>
              ))}
            </select>
          </div>
        )}
        <label className="block text-xs text-gray-500 mb-1">시간</label>
        <div className="flex items-center gap-2 mb-2.5">
          <input
            type="time"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
          />
          <span className="text-gray-400 text-sm">~</span>
          <input
            type="time"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (draftStart) {
                onUpdateTime(draftDate, draftStart, draftEnd || draftStart);
                setEditing(false);
              }
            }}
            className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-2">
      {onUpdateTime ? (
        <button
          type="button"
          onClick={openEditor}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium rounded px-1 -ml-1 hover:bg-black/5 transition-colors',
            muted ? 'text-gray-400' : 'text-gray-500',
          )}
          title="날짜·시간 편집"
        >
          <span>{slot.time} – {slot.endTime}</span>
          <span className="text-gray-300">✎</span>
        </button>
      ) : (
        <span className={cn('text-xs font-medium', muted ? 'text-gray-400' : 'text-gray-500')}>
          {slot.time} – {slot.endTime}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {slot.warning && (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
            <span>⚠️</span>
            <span>{slot.warning}</span>
          </span>
        )}
        {canStash && onClearToStash && (
          <button
            type="button"
            onClick={onClearToStash}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs"
            title="보관함으로 이동"
          >
            📦
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs"
            title="슬롯 삭제"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

function PlaceSlotCard({
  slot,
  currentDate,
  dayDates,
  onUpdateTime,
  onDelete,
  onClearToStash,
  onUpdateClosedDays,
}: {
  slot: ScheduledSlot;
  currentDate: string;
  dayDates?: DayDateOption[];
  onUpdateTime?: (date: string, time: string, endTime: string) => void;
  onDelete?: () => void;
  onClearToStash?: () => void;
  onUpdateClosedDays?: (closedDays: string[]) => void;
}) {
  const place = slot.place as WishPlace | WishLodging;

  const isPlace = place && isWishPlace(place);
  const isLodging = place && isWishLodging(place);
  const canStash = !isLodging && slot.type !== 'lodging';

  const [editingClosed, setEditingClosed] = useState(false);
  const [draftDays, setDraftDays] = useState<string[]>([]);

  if (!place) return null;

  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(
    (place as WishPlace).roadAddress || place.address || place.name
  )}`;

  return (
    <div className={cn(
      'rounded-xl border p-4 shadow-sm',
      slot.type === 'lodging' || isLodging
        ? 'bg-purple-50 border-purple-200'
        : isPlace && categoryBg[place.category]?.startsWith('bg-blue')
          ? 'bg-blue-50 border-blue-200'
          : isPlace && categoryBg[place.category]?.startsWith('bg-orange')
            ? 'bg-orange-50 border-orange-200'
            : isPlace && categoryBg[place.category]?.startsWith('bg-amber')
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200',
    )}>
      {/* Time row + actions */}
      <SlotTimeRow
        slot={slot}
        currentDate={currentDate}
        dayDates={dayDates}
        canStash={canStash}
        onUpdateTime={onUpdateTime}
        onClearToStash={onClearToStash}
        onDelete={onDelete}
      />

      {/* Place name + category badge */}
      <div className="flex items-start gap-2 mb-1">
        {isLodging && (
          <span className="mt-0.5 text-lg leading-none">🏨</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-gray-900 text-sm leading-snug">{place.name}</span>
            {isPlace && (
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                categoryBg[place.category],
              )}>
                {categoryLabel[place.category]}
              </span>
            )}
            {isLodging && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                숙소
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-xs text-gray-500 leading-relaxed">
            {(place as WishPlace).roadAddress || place.address}
          </p>

          {/* Lodging dates */}
          {isLodging && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-purple-600 font-medium">
              <span>체크인 {(place as WishLodging).checkInDate}</span>
              <span>→</span>
              <span>체크아웃 {(place as WishLodging).checkOutDate}</span>
            </div>
          )}

          {/* User note */}
          {(place as WishPlace).userNote && (
            <p className="mt-1.5 text-xs text-gray-500 bg-white/60 rounded-lg px-2 py-1 italic">
              {(place as WishPlace).userNote}
            </p>
          )}

          {/* 정기휴무 */}
          {isPlace && !editingClosed && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {place.closedDays && place.closedDays.length > 0 ? (
                <span className="text-xs text-gray-400">
                  정기휴무: {place.closedDays.map((d) => `${d}요일`).join(' · ')}
                </span>
              ) : (
                <span className="text-xs text-gray-300">정기휴무 미설정</span>
              )}
              {onUpdateClosedDays && (
                <button
                  type="button"
                  onClick={() => { setDraftDays(place.closedDays ?? []); setEditingClosed(true); }}
                  className="text-xs text-gray-400 hover:text-indigo-500 underline underline-offset-2 transition-colors"
                >
                  편집
                </button>
              )}
            </div>
          )}

          {/* 정기휴무 인라인 편집기 */}
          {isPlace && editingClosed && (
            <div className="mt-2 p-2.5 bg-white/70 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">정기휴무 요일 선택</p>
              <div className="flex gap-1 flex-wrap mb-2.5">
                {ALL_WEEKDAYS.map((day) => {
                  const selected = draftDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setDraftDays((prev) =>
                          selected ? prev.filter((d) => d !== day) : [...prev, day]
                        )
                      }
                      className={cn(
                        'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                        selected
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { onUpdateClosedDays!(draftDays); setEditingClosed(false); }}
                  className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingClosed(false)}
                  className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Naver map link — always address-based search */}
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-500 hover:text-indigo-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            지도에서 보기
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptySlotCard({
  slot,
  currentDate,
  dayDates,
  onUpdateTime,
  onDelete,
  onSearchSelect,
  regionName = '',
}: {
  slot: ScheduledSlot;
  currentDate: string;
  dayDates?: DayDateOption[];
  onUpdateTime?: (date: string, time: string, endTime: string) => void;
  onDelete?: () => void;
  onSearchSelect?: (place: KakaoPlace, category: PlaceCategory) => void;
  regionName?: string;
}) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
      <SlotTimeRow
        slot={slot}
        currentDate={currentDate}
        dayDates={dayDates}
        muted
        onUpdateTime={onUpdateTime}
        onDelete={onDelete}
      />

      {showSearch && onSearchSelect ? (
        <SlotPlaceSearch
          regionName={regionName}
          onSelect={(place, cat) => { onSearchSelect(place, cat); setShowSearch(false); }}
          onCancel={() => setShowSearch(false)}
        />
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">추가 여행지/음식점 등록 필요</p>
          <div className="flex flex-wrap gap-2">
            {onSearchSelect && (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                🔍 직접 검색
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SlotCard({ slot, currentDate, dayDates, onRequestRecommend, onUpdateTime, onDelete, onClearToStash, onUpdateClosedDays, onSearchSelect, regionName }: SlotCardProps) {
  void onRequestRecommend;
  return (
    <div>
      {(slot.travelMinFromPrev ?? 0) > 0 && (
        <TravelConnector minutes={slot.travelMinFromPrev!} />
      )}
      {slot.type === 'empty' ? (
        <EmptySlotCard
          slot={slot}
          currentDate={currentDate}
          dayDates={dayDates}
          onUpdateTime={onUpdateTime}
          onDelete={onDelete}
          onSearchSelect={onSearchSelect}
          regionName={regionName}
        />
      ) : (
        <PlaceSlotCard
          slot={slot}
          currentDate={currentDate}
          dayDates={dayDates}
          onUpdateTime={onUpdateTime}
          onDelete={onDelete}
          onClearToStash={onClearToStash}
          onUpdateClosedDays={onUpdateClosedDays}
        />
      )}
    </div>
  );
}
