'use client';

import { regionGroups } from '@/data/regions';

interface RegionSelectProps {
  value: string;
  onChange: (v: string) => void;
}

export default function RegionSelect({ value, onChange }: RegionSelectProps) {
  return (
    <div className="space-y-2">
      {regionGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.regions.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => onChange(region.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  value === region.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {region.label}
                {region.description && (
                  <span className="ml-1 text-xs opacity-60">({region.description})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
