'use client';

import { cn } from '@/lib/utils';
import type { TravelPeriod } from '@/types/plan';

interface PeriodPickerProps {
  value: TravelPeriod | null;
  onChange: (period: TravelPeriod) => void;
}

function calcNightsDays(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '';
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const days = nights + 1;
  if (nights === 0) return '총 당일치기';
  return `총 ${nights}박 ${days}일`;
}

const inputClass = cn(
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
  'text-sm text-gray-900 shadow-sm',
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
);

const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

export default function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const startDate = value?.startDate ?? '';
  const endDate = value?.endDate ?? '';
  const startTime = value?.startTime ?? '09:00';
  const endTime = value?.endTime ?? '18:00';

  function emit(patch: Partial<TravelPeriod>) {
    const next: TravelPeriod = {
      startDate,
      startTime,
      endDate,
      endTime,
      ...patch,
    };

    // Clamp endDate so it is never before startDate
    if (next.startDate && next.endDate && next.endDate < next.startDate) {
      next.endDate = next.startDate;
    }

    onChange(next);
  }

  const summary = startDate && endDate ? calcNightsDays(startDate, endDate) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        여행 기간
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* Start date */}
        <div>
          <span className={labelClass}>출발일</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => emit({ startDate: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* End date */}
        <div>
          <span className={labelClass}>도착일</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => emit({ endDate: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* Start time */}
        <div>
          <span className={labelClass}>출발 시간</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => emit({ startTime: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* End time */}
        <div>
          <span className={labelClass}>종료 시간</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => emit({ endTime: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {summary && (
        <p className="mt-2 text-xs text-gray-500">
          <span className="font-semibold text-indigo-600">{summary}</span>
          {startDate && endDate && startDate === endDate && (
            <span className="ml-1">({startDate})</span>
          )}
          {startDate && endDate && startDate !== endDate && (
            <span className="ml-1">({startDate} ~ {endDate})</span>
          )}
        </p>
      )}
    </div>
  );
}
