'use client';

import { useState } from 'react';
import { KakaoPlace, WishLodging } from '@/types/plan';
import { cn } from '@/lib/utils';

interface LodgingFormProps {
  regionLat: number;
  regionLng: number;
  regionName: string;
  travelStartDate: string;
  travelEndDate: string;
  lodgings: WishLodging[];
  onAdd: (place: KakaoPlace, checkIn: string, checkOut: string) => void;
  onDelete: (id: string) => void;
  onDateChange: (id: string, checkIn: string, checkOut: string) => void;
}

interface SearchResult {
  places: KakaoPlace[];
  isEnd: boolean;
}

interface DateWarning {
  checkIn?: string;
  checkOut?: string;
}

function validateDates(
  checkIn: string,
  checkOut: string,
  travelStart: string,
  travelEnd: string,
): DateWarning {
  const warnings: DateWarning = {};
  if (checkIn && (checkIn < travelStart || checkIn > travelEnd)) {
    warnings.checkIn = `체크인 날짜가 여행 기간(${travelStart} ~ ${travelEnd}) 밖입니다.`;
  }
  if (checkOut && (checkOut < travelStart || checkOut > travelEnd)) {
    warnings.checkOut = `체크아웃 날짜가 여행 기간(${travelStart} ~ ${travelEnd}) 밖입니다.`;
  }
  if (checkIn && checkOut && checkOut <= checkIn) {
    warnings.checkOut = '체크아웃은 체크인보다 나중이어야 합니다.';
  }
  return warnings;
}

export default function LodgingForm({
  regionLat,
  regionLng,
  regionName,
  travelStartDate,
  travelEndDate,
  lodgings,
  onAdd,
  onDelete,
  onDateChange,
}: LodgingFormProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Per-result pending dates before user clicks 추가
  const [pendingDates, setPendingDates] = useState<Record<string, { checkIn: string; checkOut: string }>>({});
  // Date warnings for added lodgings
  const [dateWarnings, setDateWarnings] = useState<Record<string, DateWarning>>({});

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const params = new URLSearchParams({
        query: `${regionName} ${trimmed} 숙소`,
        x: String(regionLng),
        y: String(regionLat),
        radius: '20000',
        category_group_code: 'AD5',
      });
      const res = await fetch(`/api/place/search?${params}`);
      if (!res.ok) throw new Error('검색에 실패했습니다.');
      const data: SearchResult = await res.json();
      if (data.places.length === 0) {
        setSearchError('검색 결과가 없습니다. 다른 검색어를 시도해보세요.');
      } else {
        setSearchResults(data.places);
      }
    } catch {
      setSearchError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = (place: KakaoPlace) => {
    const dates = pendingDates[place.id] ?? { checkIn: travelStartDate, checkOut: travelEndDate };
    onAdd(place, dates.checkIn, dates.checkOut);
    // Validate after add
    const warnings = validateDates(dates.checkIn, dates.checkOut, travelStartDate, travelEndDate);
    if (Object.keys(warnings).length > 0) {
      setDateWarnings((prev) => ({ ...prev, [place.id]: warnings }));
    }
    // Clear from results
    setSearchResults((prev) => prev.filter((p) => p.id !== place.id));
  };

  const handleLodgingDateChange = (
    lodging: WishLodging,
    field: 'checkIn' | 'checkOut',
    value: string,
  ) => {
    const newCheckIn = field === 'checkIn' ? value : lodging.checkInDate;
    const newCheckOut = field === 'checkOut' ? value : lodging.checkOutDate;
    onDateChange(lodging.id, newCheckIn, newCheckOut);
    const warnings = validateDates(newCheckIn, newCheckOut, travelStartDate, travelEndDate);
    setDateWarnings((prev) => ({ ...prev, [lodging.id]: warnings }));
  };

  const handlePendingDateChange = (placeId: string, field: 'checkIn' | 'checkOut', value: string) => {
    setPendingDates((prev) => {
      const current = prev[placeId] ?? { checkIn: travelStartDate, checkOut: travelEndDate };
      return { ...prev, [placeId]: { ...current, [field]: value } };
    });
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">숙소 검색</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={`예: 호텔, 펜션, 게스트하우스`}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {searching ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                검색 중
              </span>
            ) : '검색'}
          </button>
        </div>
        {searchError && (
          <p className="mt-1.5 text-xs text-red-500">{searchError}</p>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <p className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
            검색 결과 {searchResults.length}건
          </p>
          {searchResults.map((place) => {
            const pd = pendingDates[place.id] ?? { checkIn: travelStartDate, checkOut: travelEndDate };
            return (
              <div key={place.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{place.place_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {place.road_address_name || place.address_name}
                    </p>
                    {place.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{place.phone}</p>
                    )}
                  </div>
                  <a
                    href={place.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap"
                  >
                    지도 보기
                  </a>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">체크인</label>
                      <input
                        type="date"
                        value={pd.checkIn}
                        min={travelStartDate}
                        max={travelEndDate}
                        onChange={(e) => handlePendingDateChange(place.id, 'checkIn', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">체크아웃</label>
                      <input
                        type="date"
                        value={pd.checkOut}
                        min={pd.checkIn || travelStartDate}
                        max={travelEndDate}
                        onChange={(e) => handlePendingDateChange(place.id, 'checkOut', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(place)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                  >
                    추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Added lodgings */}
      {lodgings.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">추가된 숙소 ({lodgings.length})</p>
          {lodgings.map((lodging) => {
            const warnings = dateWarnings[lodging.id] ?? {};
            return (
              <div
                key={lodging.id}
                className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">🏨</span>
                      <p className="text-sm font-semibold text-gray-900 truncate">{lodging.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {lodging.roadAddress || lodging.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(lodging.id)}
                    aria-label="숙소 삭제"
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">체크인 날짜</label>
                    <input
                      type="date"
                      value={lodging.checkInDate}
                      min={travelStartDate}
                      max={travelEndDate}
                      onChange={(e) =>
                        handleLodgingDateChange(lodging, 'checkIn', e.target.value)
                      }
                      className={cn(
                        'w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white',
                        warnings.checkIn ? 'border-yellow-400' : 'border-gray-200',
                      )}
                    />
                    {warnings.checkIn && (
                      <p className="mt-1 text-xs text-yellow-600">{warnings.checkIn}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">체크아웃 날짜</label>
                    <input
                      type="date"
                      value={lodging.checkOutDate}
                      min={lodging.checkInDate || travelStartDate}
                      max={travelEndDate}
                      onChange={(e) =>
                        handleLodgingDateChange(lodging, 'checkOut', e.target.value)
                      }
                      className={cn(
                        'w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white',
                        warnings.checkOut ? 'border-yellow-400' : 'border-gray-200',
                      )}
                    />
                    {warnings.checkOut && (
                      <p className="mt-1 text-xs text-yellow-600">{warnings.checkOut}</p>
                    )}
                  </div>
                </div>

                <a
                  href={lodging.kakaoMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  카카오맵에서 보기
                </a>
              </div>
            );
          })}
        </div>
      )}

      {lodgings.length === 0 && searchResults.length === 0 && !searching && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-3xl mb-2">🏨</p>
          <p className="text-sm">숙소를 검색해서 추가해보세요.</p>
          <p className="text-xs mt-1">호텔, 펜션, 게스트하우스 등 모두 검색 가능합니다.</p>
        </div>
      )}
    </div>
  );
}
