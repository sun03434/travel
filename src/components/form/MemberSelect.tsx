'use client';

import { useRef, useEffect, useState, CSSProperties } from 'react';
import { memberOptions } from '@/data/members';
import { MemberTag } from '@/types/place';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const container = containerRef.current;
    const inner = textRef.current;
    if (!container || !inner) return;
    const overflow = inner.scrollWidth - container.clientWidth;
    if (overflow > 0) {
      setStyle({ '--marquee-offset': `-${overflow}px` } as CSSProperties);
    } else {
      setStyle({});
    }
  }, [text]);

  const isOverflow = Object.keys(style).length > 0;

  return (
    <span ref={containerRef} className="block overflow-hidden">
      <span
        ref={textRef}
        style={style}
        className={`${className ?? ''} inline-block whitespace-nowrap ${isOverflow ? 'animate-marquee' : ''}`}
      >
        {text}
      </span>
    </span>
  );
}

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
          <span className="text-lg flex-shrink-0">{opt.emoji}</span>
          <div className="text-left min-w-0 overflow-hidden">
            <MarqueeText
              text={opt.label}
              className={`font-medium leading-tight text-sm ${value === opt.id ? 'text-white' : ''}`}
            />
            <MarqueeText
              text={opt.description}
              className={`text-xs leading-tight ${value === opt.id ? 'text-white opacity-70' : 'text-gray-400'}`}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
