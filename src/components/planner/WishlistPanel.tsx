'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PlaceCategory, WishPlace } from '@/types/plan';

type ListType = 'attraction' | 'restaurant';

interface WishlistPanelProps {
  attractions: WishPlace[];
  restaurants: WishPlace[];
  onDelete: (id: string, listType: ListType) => void;
  onNoteChange: (id: string, listType: ListType, note: string) => void;
}

const CATEGORY_BADGE: Record<PlaceCategory, string> = {
  attraction: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  cafe: 'bg-amber-100 text-amber-700',
  shopping: 'bg-purple-100 text-purple-700',
};

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  attraction: '여행지',
  restaurant: '음식점',
  cafe: '카페',
  shopping: '쇼핑',
};

interface PlaceItemProps {
  place: WishPlace;
  listType: ListType;
  onDelete: (id: string, listType: ListType) => void;
  onNoteChange: (id: string, listType: ListType, note: string) => void;
}

function PlaceItem({ place, listType, onDelete, onNoteChange }: PlaceItemProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(place.userNote ?? '');

  function handleNoteBlur() {
    onNoteChange(place.id, listType, note);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">
              {place.name}
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium',
                CATEGORY_BADGE[place.category]
              )}
            >
              {CATEGORY_LABEL[place.category]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400 truncate">
            {place.roadAddress || place.address}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            title="메모 추가"
            className={cn(
              'rounded-md px-1.5 py-1 text-xs transition-colors',
              noteOpen
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            메모
          </button>
          <button
            type="button"
            onClick={() => onDelete(place.id, listType)}
            title="삭제"
            className="rounded-md px-1.5 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {noteOpen && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="메모를 입력하세요…"
          rows={2}
          className={cn(
            'mt-2 w-full resize-none rounded-md border border-gray-200 bg-gray-50',
            'px-2.5 py-1.5 text-xs text-gray-700 placeholder:text-gray-400',
            'focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400'
          )}
        />
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty: boolean;
}

function Section({ title, count, children, isEmpty }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {count > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {count}
          </span>
        )}
      </div>
      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-400">
          아직 추가된 장소가 없어요. 위 검색창에서 추가해보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  );
}

export default function WishlistPanel({
  attractions,
  restaurants,
  onDelete,
  onNoteChange,
}: WishlistPanelProps) {
  // Split restaurants into subcategories for display grouping
  const foodItems = restaurants.filter(
    (p) => p.category === 'restaurant' || p.category === 'cafe'
  );
  const shoppingItems = restaurants.filter((p) => p.category === 'shopping');

  const totalCount = attractions.length + restaurants.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">위시리스트</h2>
        {totalCount > 0 && (
          <span className="text-xs text-gray-400">총 {totalCount}개</span>
        )}
      </div>

      {/* 여행지 */}
      <Section
        title="여행지"
        count={attractions.length}
        isEmpty={attractions.length === 0}
      >
        {attractions.map((place) => (
          <PlaceItem
            key={place.id}
            place={place}
            listType="attraction"
            onDelete={onDelete}
            onNoteChange={onNoteChange}
          />
        ))}
      </Section>

      {/* 음식점 / 카페 */}
      <Section
        title="음식점 · 카페"
        count={foodItems.length}
        isEmpty={foodItems.length === 0}
      >
        {foodItems.map((place) => (
          <PlaceItem
            key={place.id}
            place={place}
            listType="restaurant"
            onDelete={onDelete}
            onNoteChange={onNoteChange}
          />
        ))}
      </Section>

      {/* 쇼핑 */}
      <Section
        title="쇼핑"
        count={shoppingItems.length}
        isEmpty={shoppingItems.length === 0}
      >
        {shoppingItems.map((place) => (
          <PlaceItem
            key={place.id}
            place={place}
            listType="restaurant"
            onDelete={onDelete}
            onNoteChange={onNoteChange}
          />
        ))}
      </Section>
    </div>
  );
}
