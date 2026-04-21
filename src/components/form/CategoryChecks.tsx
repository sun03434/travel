'use client';

import { Category } from '@/types/place';

const categories: { id: Category; label: string; emoji: string; description: string }[] = [
  { id: 'attraction', label: '관광지', emoji: '🗺️', description: '명소·액티비티' },
  { id: 'restaurant', label: '맛집', emoji: '🍽️', description: '식당·카페' },
  { id: 'lodging', label: '숙소', emoji: '🏨', description: '호텔·펜션' },
];

interface CategoryChecksProps {
  value: Category[];
  onChange: (v: Category[]) => void;
}

export default function CategoryChecks({ value, onChange }: CategoryChecksProps) {
  const toggle = (id: Category) => {
    if (value.includes(id)) {
      if (value.length === 1) return; // 최소 1개 유지
      onChange(value.filter((c) => c !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((cat) => {
        const checked = value.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
              checked
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
            }`}
          >
            <span className="text-xl">{cat.emoji}</span>
            <div className="text-left">
              <p className="font-semibold">{cat.label}</p>
              <p className="text-xs opacity-70">{cat.description}</p>
            </div>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ml-1 ${
              checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
            }`}>
              {checked && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <polyline points="1.5 5 4 7.5 8.5 2.5" strokeWidth="1.5" stroke="white" fill="none" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
