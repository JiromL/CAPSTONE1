import Image from 'next/image';
import type { CSSProperties } from 'react';

// CPS archer mark. Shown on a white tile so the green reads on both the navy sidebar and
// light pages; size the tile where it is used and the mark fills it with a small margin.
export const CPS_LOGO_TILE: CSSProperties = {
  background: '#FFFFFF',
  boxShadow: 'inset 0 0 0 1px rgba(13, 21, 38, 0.08)',
};

export function CpsLogoMark() {
  return (
    <Image src="/cps-logo.png" alt="" aria-hidden width={64} height={64}
      className="w-[80%] h-[80%] object-contain select-none pointer-events-none" priority />
  );
}
