'use client';

import { useState, useRef } from 'react';
import { Guide } from '@/types/place';
import { buildShareUrl } from '@/lib/shareUrl';

interface ShareBarProps {
  guide: Guide;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function ShareBar({ guide, contentRef }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopyLink = async () => {
    const url = buildShareUrl(guide);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebShare = async () => {
    const url = buildShareUrl(guide);
    if (navigator.share) {
      await navigator.share({
        title: '여행 가이드',
        text: `${guide.inputs.region} 여행 가이드를 공유합니다!`,
        url,
      });
    }
  };

  const handleSaveImage = async () => {
    if (!contentRef.current || saving) return;
    setSaving(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(contentRef.current, {
        useCORS: true,
        background: '#ffffff',
      } as Parameters<typeof html2canvas>[1]);
      const link = document.createElement('a');
      link.download = `travel-guide-${guide.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setSaving(false);
    }
  };

  const hasWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="flex flex-wrap gap-2">
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

      {hasWebShare && (
        <button
          onClick={handleWebShare}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          공유하기
        </button>
      )}

      <button
        onClick={handleSaveImage}
        disabled={saving}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {saving ? '저장 중...' : '이미지 저장'}
      </button>
    </div>
  );
}
