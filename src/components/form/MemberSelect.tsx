'use client';

import { memberOptions } from '@/data/members';
import { MemberTag } from '@/types/place';

interface MemberSelectProps {
  value: MemberTag | '';
  onChange: (v: MemberTag) => void;
}

export default function MemberSelect({ value, onChange }: MemberSelectProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {memberOptions.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
            value === opt.id
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <span className="text-lg">{opt.emoji}</span>
          <div className="text-left min-w-0">
            <p className="font-medium leading-tight truncate">{opt.label}</p>
            <p className={`text-xs leading-tight truncate ${value === opt.id ? 'opacity-70' : 'text-gray-400'}`}>
              {opt.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
