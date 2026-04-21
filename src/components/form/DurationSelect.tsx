'use client';

import { DurationKey } from '@/types/place';

const durations: { id: DurationKey; label: string; emoji: string }[] = [
  { id: 'day', label: '당일치기', emoji: '☀️' },
  { id: '1n2d', label: '1박 2일', emoji: '🌙' },
  { id: '2n3d', label: '2박 3일', emoji: '🌙🌙' },
  { id: '3n4d', label: '3박 4일', emoji: '🌙🌙🌙' },
  { id: '4n_plus', label: '4박 이상', emoji: '✈️' },
];

interface DurationSelectProps {
  value: DurationKey | '';
  onChange: (v: DurationKey) => void;
}

export default function DurationSelect({ value, onChange }: DurationSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {durations.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
            value === d.id
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <span>{d.emoji}</span>
          <span>{d.label}</span>
        </button>
      ))}
    </div>
  );
}
