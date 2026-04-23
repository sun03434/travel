'use client';

import { useState } from 'react';
import { Guide } from '@/types/place';
import { buildShareUrl } from '@/lib/shareUrl';

interface ShareBarProps {
  guide: Guide;
}

export default function ShareBar({ guide }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = buildShareUrl(guide);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopyLink}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          복사됨!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          링크 복사
        </>
      )}
    </button>
  );
}
