'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { KakaoPlace, PlaceCategory } from '@/types/plan';

interface SlotPlaceSearchProps {
  regionName: string;
  onSelect: (place: KakaoPlace, category: PlaceCategory) => void;
  onCancel: () => void;
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

export default function SlotPlaceSearch({ regionName, onSelect, onCancel }: SlotPlaceSearchProps) {
  const [category, setCategory] = useState<PlaceCategory>('attraction');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const params = new URLSearchParams({ query: trimmed, regionName });
      const res = await fetch(`/api/place/search?${params}`);
      if (!res.ok) throw new Error('검색에 실패했습니다.');
      const data: { places: KakaoPlace[] } = await res.json();
      setResults(data.places);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Category tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setCategory(cat.id); setResults([]); setSearched(false); }}
            className={cn(
              'flex-1 rounded-md px-1 py-1 text-xs font-medium transition-all',
              category === cat.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={`${regionName} ${CATEGORIES.find(c => c.id === category)?.label} 검색`}
          autoFocus
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '…' : '검색'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Error */}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {/* Results */}
      {(results.length > 0 || (searched && !loading)) && (
        <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-gray-400">검색 결과가 없습니다.</p>
          ) : (
            results.map((place) => (
              <div key={place.id} className="flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{place.place_name}</span>
                    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium', CATEGORY_BADGE[category])}>
                      {CATEGORIES.find(c => c.id === category)?.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {place.road_address_name || place.address_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(place, category)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  배치
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
