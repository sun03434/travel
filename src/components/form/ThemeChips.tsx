'use client';

import { Theme } from '@/types/place';

const themes: { id: Theme; label: string; emoji: string }[] = [
  { id: 'healing', label: '힐링', emoji: '🌿' },
  { id: 'activity', label: '액티비티', emoji: '🏄' },
  { id: 'culture', label: '문화·예술', emoji: '🎨' },
  { id: 'night', label: '야경', emoji: '🌃' },
  { id: 'hotplace', label: '핫플레이스', emoji: '🔥' },
  { id: 'indoor', label: '실내(우천시)', emoji: '☂️' },
  { id: 'shopping', label: '쇼핑', emoji: '🛍️' },
  { id: 'nature', label: '자연', emoji: '🌲' },
];

interface ThemeChipsProps {
  value: Theme[];
  onChange: (v: Theme[]) => void;
}

export default function ThemeChips({ value, onChange }: ThemeChipsProps) {
  const toggle = (id: Theme) => {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((t) => {
        const selected = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
              selected
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300 hover:text-rose-500'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          초기화
        </button>
      )}
    </div>
  );
}
