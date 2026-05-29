'use client';

import { useState } from 'react';
import type { WishPlace, WishLodging, ScheduledDay } from '@/types/plan';
import { cn } from '@/lib/utils';

interface StashPanelProps {
  stash: (WishPlace | WishLodging)[];
  schedule: ScheduledDay[];
  onPlaceFromStash: (place: WishPlace | WishLodging, dayDate: string, slotId: string) => void;
  onRemoveFromStash: (placeId: string) => void;
}

const categoryLabel = { attraction: '관광지', restaurant: '맛집', cafe: '카페', shopping: '쇼핑' };
const categoryBg = {
  attraction: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  cafe: 'bg-amber-100 text-amber-700',
  shopping: 'bg-pink-100 text-pink-700',
};

function isWishPlace(p: WishPlace | WishLodging): p is WishPlace {
  return 'category' in p;
}

export default function StashPanel({ stash, schedule, onPlaceFromStash, onRemoveFromStash }: StashPanelProps) {
  const [open, setOpen] = useState(false);
  const [placingItem, setPlacingItem] = useState<WishPlace | WishLodging | null>(null);

  if (stash.length === 0) return null;

  const emptySlots = schedule.flatMap((day) =>
    day.slots
      .filter((s) => s.type === 'empty')
      .map((s) => ({ day, slot: s }))
  );

  return (
    <>
      {/* 배치 슬롯 선택 모달 */}
      {placingItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setPlacingItem(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">배치할 슬롯 선택</p>
                <p className="font-bold text-gray-900">{placingItem.name}</p>
              </div>
              <button
                onClick={() => setPlacingItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            {emptySlots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">빈 슬롯이 없습니다.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emptySlots.map(({ day, slot }) => (
                  <button
                    key={slot.id}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                    onClick={() => {
                      onPlaceFromStash(placingItem, day.date, slot.id);
                      setPlacingItem(null);
                    }}
                  >
                    <span className="text-xs text-gray-500">{day.dayLabel}</span>
                    <span className="mx-2 text-gray-300">·</span>
                    <span className="text-sm font-semibold text-gray-800">{slot.time} – {slot.endTime}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 고정 패널 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shadow-lg">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span>📦 보관함</span>
          <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-bold">{stash.length}</span>
          <span className="text-xs opacity-70">{open ? '▼' : '▲'}</span>
        </button>

        {open && (
          <div className="bg-white border-t border-gray-200 max-h-56 overflow-y-auto">
            <div className="p-3 space-y-2">
              {stash.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{place.name}</span>
                      {isWishPlace(place) ? (
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full flex-shrink-0', categoryBg[place.category])}>
                          {categoryLabel[place.category]}
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-purple-100 text-purple-700">
                          숙소
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {(place as WishPlace).roadAddress || place.address}
                    </p>
                  </div>
                  <button
                    onClick={() => setPlacingItem(place)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    배치하기
                  </button>
                  <button
                    onClick={() => onRemoveFromStash(place.id)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 text-lg transition-colors"
                    title="보관함에서 제거"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
