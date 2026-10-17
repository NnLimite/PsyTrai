import React, { useState } from 'react'
import { C } from '../tokens';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  rightEl?: React.ReactNode
}

export function Field({ label, error, rightEl, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            width: '100%', padding: rightEl ? '13px 44px 13px 16px' : '13px 16px',
            fontSize: 15, borderRadius: C.radius, fontFamily: 'inherit',
            border: `1.5px solid ${error ? C.danger : focused ? C.borderFocus : C.border}`,
            backgroundColor: C.surfaceAlt, color: C.textPrimary, outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }} />
        {rightEl && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }}>{rightEl}</div>}
      </div>
      {error && <p style={{ margin: '6px 0 0', fontSize: 13, color: C.danger }}>{error}</p>}
    </div>
  )
}