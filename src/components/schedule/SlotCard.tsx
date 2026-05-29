'use client';

import { useState } from 'react';
import { ScheduledSlot, WishPlace, WishLodging, PlaceCategory, KakaoPlace } from '@/types/plan';
import { cn } from '@/lib/utils';
import SlotPlaceSearch from './SlotPlaceSearch';

const ALL_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

interface SlotCardProps {
  slot: ScheduledSlot;
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onAddToWishlist?: (slotTime: string, category: 'attraction' | 'restaurant') => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
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

function PlaceSlotCard({
  slot,
  onMoveUp,
  onMoveDown,
  onClearToStash,
  onUpdateClosedDays,
}: {
  slot: ScheduledSlot;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onClearToStash?: () => void;
  onUpdateClosedDays?: (closedDays: string[]) => void;
}) {
  const place = slot.place as WishPlace | WishLodging;
  if (!place) return null;

  const isPlace = isWishPlace(place);
  const isLodging = isWishLodging(place);
  const canMove = !isLodging && slot.type !== 'lodging';

  const [editingClosed, setEditingClosed] = useState(false);
  const [draftDays, setDraftDays] = useState<string[]>([]);

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
      {/* Time row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          {slot.time} – {slot.endTime}
        </span>
        <div className="flex items-center gap-1.5">
          {slot.warning && (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
              <span>⚠️</span>
              <span>{slot.warning}</span>
            </span>
          )}
          {canMove && (
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="위로 이동"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="아래로 이동"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={onClearToStash}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs"
                title="보관함으로 이동"
              >
                📦
              </button>
            </div>
          )}
        </div>
      </div>

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
  onRequestRecommend,
  onAddToWishlist,
  onSearchSelect,
  regionName = '',
}: {
  slot: ScheduledSlot;
  onRequestRecommend: (slot: ScheduledSlot) => void;
  onAddToWishlist?: (slotTime: string, category: 'attraction' | 'restaurant') => void;
  onSearchSelect?: (place: KakaoPlace, category: PlaceCategory) => void;
  regionName?: string;
}) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">
          {slot.time} – {slot.endTime}
        </span>
      </div>

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
            <button
              type="button"
              onClick={() => onRequestRecommend(slot)}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ✨ AI 추천 받기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SlotCard({ slot, onRequestRecommend, onAddToWishlist, onMoveUp, onMoveDown, onClearToStash, onUpdateClosedDays, onSearchSelect, regionName }: SlotCardProps) {
  return (
    <div>
      {(slot.travelMinFromPrev ?? 0) > 0 && (
        <TravelConnector minutes={slot.travelMinFromPrev!} />
      )}
      {slot.type === 'empty' ? (
        <EmptySlotCard
          slot={slot}
          onRequestRecommend={onRequestRecommend}
          onAddToWishlist={onAddToWishlist}
          onSearchSelect={onSearchSelect}
          regionName={regionName}
        />
      ) : (
        <PlaceSlotCard slot={slot} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onClearToStash={onClearToStash} onUpdateClosedDays={onUpdateClosedDays} />
      )}
    </div>
  );
}
