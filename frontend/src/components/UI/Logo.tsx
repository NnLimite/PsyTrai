import React from 'react'
import { Link } from 'react-router-dom'
import { C } from '../tokens';

export function Logo({ size = 26, linkTo = '/' }: { size?: number; linkTo?: string }) {
  const content = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <span style={{
        width: size + 8, height: size + 8, borderRadius: (size + 8) * 0.28,
        background: `linear-gradient(135deg, ${C.accent}, #52b788)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
          <path d="M10 2C6.13 2 3 5.13 3 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 10c-1.75 0-3.29-.9-4.2-2.26.02-1.39 2.8-2.16 4.2-2.16 1.4 0 4.18.77 4.2 2.16C13.29 14.1 11.75 15 10 15z" fill="white" />
        </svg>
      </span>
      <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color: C.textPrimary }}>
        Psy<span style={{ color: C.accent }}>Trainer</span>
      </span>
    </span>
  )
  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{content}</Link> : content
}