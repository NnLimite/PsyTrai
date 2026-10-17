import React, { useState, useEffect } from 'react'
import { C } from '../tokens';

interface ToastProps {
  msg: string
  type: 'success' | 'error'
  onClose: () => void
}

export function Toast({ msg, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? C.successLight : C.dangerLight,
      border: `1px solid ${type === 'success' ? C.success : C.danger}`,
      color: type === 'success' ? '#166534' : C.danger,
      padding: '14px 20px', borderRadius: C.radius, fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360,
      boxShadow: C.shadowMd, animation: 'slideUp 0.3s ease',
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{msg}</span>
      <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }}>✕</span>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const show = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })
  const ToastEl = toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null
  return { show, ToastEl }
}