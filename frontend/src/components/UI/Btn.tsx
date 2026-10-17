import React from 'react'
import { C } from '../tokens';
import { Spinner } from './Spinner'

interface BtnProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  loading?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

export function Btn({
  children, onClick, type = 'button', variant = 'primary',
  loading = false, fullWidth = false, size = 'md', style: extra = {},
}: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, borderRadius: C.radius,
    transition: 'all 0.2s ease', opacity: loading ? 0.65 : 1,
    width: fullWidth ? '100%' : undefined,
  }
  
  const sizes = { 
    sm: { fontSize: 13, padding: '8px 16px' }, 
    md: { fontSize: 15, padding: '12px 24px' }, 
    lg: { fontSize: 16, padding: '14px 32px' } 
  }
  
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.accent, color: '#fff', boxShadow: C.shadowGreen },
    ghost:   { background: 'transparent', color: C.textSecondary, boxShadow: 'none' },
    danger:  { background: C.danger, color: '#fff' },
    outline: { background: 'transparent', color: C.accent, border: `1.5px solid ${C.accent}` },
  }
  
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extra }}>
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}