'use client';

import { REGIONS, findRegionCoords } from '@/data/regions';
import type { Region } from '@/types/plan';
import { cn } from '@/lib/utils';

interface RegionPickerProps {
  value: { province: string; city?: string } | null;
  onChange: (region: Region) => void;
}

export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  const selectedRegionData = value
    ? REGIONS.find((r) => r.province === value.province)
    : null;

  const hasCities =
    selectedRegionData != null && selectedRegionData.cities.length > 0;

  function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const province = e.target.value;
    if (!province) return;

    const coords = findRegionCoords(province);
    onChange({
      province,
      city: undefined,
      displayName: province,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!value) return;
    const city = e.target.value || undefined;
    const coords = findRegionCoords(value.province);
    const displayName = city ? `${value.province} ${city}` : value.province;
    onChange({
      province: value.province,
      city,
      displayName,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        여행 지역
      </label>
      <div className="flex gap-2">
        <select
          value={value?.province ?? ''}
          onChange={handleProvinceChange}
          className={cn(
            'flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2',
            'text-sm text-gray-900 shadow-sm',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'
          )}
        >
          <option value="">시/도 선택</option>
          {REGIONS.map((r) => (
            <option key={r.province} value={r.province}>
              {r.province}
            </option>
          ))}
        </select>

        {hasCities && (
          <select
            value={value?.city ?? ''}
            onChange={handleCityChange}
            className={cn(
              'flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2',
              'text-sm text-gray-900 shadow-sm',
              'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
            )}
          >
            <option value="">시/군 선택 안 함 (도 전체)</option>
            {selectedRegionData!.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        )}
      </div>

      {value && (
        <p className="mt-1.5 text-xs text-gray-500">
          선택된 지역: <span className="font-medium text-indigo-600">{value.city ? `${value.province} ${value.city}` : value.province}</span>
        </p>
      )}
    </div>
  );
}
