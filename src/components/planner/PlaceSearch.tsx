'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { KakaoPlace, PlaceCategory } from '@/types/plan';

interface PlaceSearchProps {
  regionLat: number;
  regionLng: number;
  regionName: string;
  onAdd: (place: KakaoPlace, category: PlaceCategory) => void;
}

const CATEGORIES: { id: PlaceCategory; label: string }[] = [
  { id: 'attraction', label: '여행지' },
  { id: 'restaurant', label: '음식점' },
  { id: 'cafe', label: '카페' },
  { id: 'shopping', label: '쇼핑' },
];

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

const SEARCH_RADIUS = 30000;

export default function PlaceSearch({
  regionLat,
  regionLng,
  regionName,
  onAdd,
}: PlaceSearchProps) {
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('attraction');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(false);

    try {
      const params = new URLSearchParams({
        query: trimmed,
        x: String(regionLng),
        y: String(regionLat),
        radius: String(SEARCH_RADIUS),
      });

      const res = await fetch(`/api/place/search?${params}`);
      if (!res.ok) throw new Error('검색에 실패했습니다.');

      const data: { places: KakaoPlace[]; isEnd: boolean; totalCount: number } =
        await res.json();

      setResults(data.places);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleAdd(place: KakaoPlace) {
    onAdd(place, activeCategory);
    setAddedIds((prev) => new Set(prev).add(place.id));
  }

  function handleCategoryChange(cat: PlaceCategory) {
    setActiveCategory(cat);
    setResults([]);
    setSearched(false);
    setError(null);
    setAddedIds(new Set());
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Category tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryChange(cat.id)}
            className={cn(
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
              activeCategory === cat.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`${regionName}에서 ${CATEGORY_LABEL[activeCategory]} 검색`}
          className={cn(
            'flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2',
            'text-sm text-gray-900 placeholder:text-gray-400 shadow-sm',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          )}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {loading ? '검색 중…' : '검색'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Results */}
      {(results.length > 0 || (searched && !loading)) && (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              검색 결과가 없습니다.
            </p>
          ) : (
            results.map((place) => {
              const added = addedIds.has(place.id);
              return (
                <div
                  key={place.id}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {place.place_name}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium',
                          CATEGORY_BADGE[activeCategory]
                        )}
                      >
                        {CATEGORY_LABEL[activeCategory]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">
                      {place.road_address_name || place.address_name}
                    </p>
                    {place.phone && (
                      <p className="mt-0.5 text-xs text-gray-400">{place.phone}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(place)}
                    disabled={added}
                    className={cn(
                      'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      added
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    )}
                  >
                    {added ? '추가됨' : '추가'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
