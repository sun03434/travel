'use client';

import { useState } from 'react';
import { ScheduledSlot, WishPlace } from '@/types/plan';
import { cn } from '@/lib/utils';

interface RecommendedPlace extends WishPlace {
  reason: string;
}

interface RecommendButtonProps {
  slot: ScheduledSlot;
  dayDate: string;
  region: string;
  regionLat: number;
  regionLng: number;
  prevPlace?: { name: string; lat: number; lng: number };
  nextPlace?: { name: string; lat: number; lng: number };
  isNextLodging?: boolean;
  onSelect: (place: WishPlace) => void;
}

const categoryLabel: Record<string, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  cafe: '카페',
  shopping: '쇼핑',
};

const categoryBg: Record<string, string> = {
  attraction: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  cafe: 'bg-amber-100 text-amber-700',
  shopping: 'bg-pink-100 text-pink-700',
};

export default function RecommendButton({
  slot,
  dayDate,
  region,
  regionLat,
  regionLng,
  prevPlace,
  nextPlace,
  isNextLodging = false,
  onSelect,
}: RecommendButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedPlace[]>([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);

    try {
      const res = await fetch('/api/schedule/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          date: dayDate,
          slotTime: slot.time,
          category: 'attraction',
          prevPlace,
          nextPlace,
          isNextLodging,
          regionLat,
          regionLng,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'AI 추천 요청에 실패했습니다.');
      }

      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 추천 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      fetchRecommendations();
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (place: RecommendedPlace) => {
    setSelectedId(place.id);
    onSelect(place);
    // Brief visual feedback, then close
    setTimeout(() => setIsOpen(false), 300);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          isOpen
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-indigo-600 text-white hover:bg-indigo-700',
        )}
      >
        {isOpen ? '✕ 닫기' : '✨ AI 추천 받기'}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-sm font-semibold text-indigo-800">AI 장소 추천</span>
            </div>
            <span className="text-xs text-indigo-600">
              {slot.time} · {region}
            </span>
          </div>

          <div className="p-4">
            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <svg className="animate-spin w-7 h-7 text-indigo-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-indigo-700">AI가 장소를 추천하는 중...</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    {prevPlace && `${prevPlace.name}에서`} 이동하기 좋은 장소를 찾고 있어요.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="text-center py-6">
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <button
                  type="button"
                  onClick={fetchRecommendations}
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* Results */}
            {!loading && !error && recommendations.length > 0 && (
              <div className="space-y-3">
                {recommendations.map((place) => (
                  <div
                    key={place.id}
                    className={cn(
                      'bg-white rounded-xl border p-4 transition-all',
                      selectedId === place.id
                        ? 'border-indigo-400 shadow-md ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-gray-900 text-sm">{place.name}</span>
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            categoryBg[place.category] ?? 'bg-gray-100 text-gray-600',
                          )}>
                            {categoryLabel[place.category] ?? place.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{place.roadAddress || place.address}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="flex items-start gap-1.5 mb-3">
                      <span className="text-sm leading-none mt-0.5">💡</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{place.reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2">
                      {place.kakaoMapUrl && (
                        <a
                          href={place.kakaoMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                          지도 보기
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelect(place)}
                        disabled={selectedId !== null}
                        className={cn(
                          'ml-auto px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                          selectedId === place.id
                            ? 'bg-green-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
                        )}
                      >
                        {selectedId === place.id ? '✓ 선택됨' : '이 장소로 선택'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && recommendations.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">추천 결과가 없습니다.</p>
                <button
                  type="button"
                  onClick={fetchRecommendations}
                  className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
