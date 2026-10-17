import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SeverityControl from '../components/SeverityControl'
import StateChart from '../components/StateChart'

// ─── КОНСТАНТА API ────────────────────────────────────────────
const API_URL = 'http://localhost:8001'

// ─── Цветовая система ─────────────────────────────────────────
const C = {
  bg: '#f0fdf4',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2d6a4f',
  accentHover: '#1b4332',
  accentLight: '#d8f3dc',
  accentSoft: '#f0fdf4',
  accentMid: '#52b788',
  border: '#e2e8f0',
  borderFocus: '#2d6a4f',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  shadow: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
  shadowLg: '0 12px 40px rgba(15,23,42,0.12)',
  radius: '12px',
  radiusLg: '18px',
}

// ─── Типы ──────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'student' | 'patient' | 'hint' | 'system'
  content: string
  ts: string
  hint?: string
}

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  disorder: string
  lore: string
  severity: string
  avatarLetter: string
}

interface Session {
  id: string
  status: 'active' | 'paused' | 'completed'
  mode: 'psychotherapy'
  startedAt: string
}

// ─── Мок-данные ──────────────────────────────────────────────
const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'Алексей', age: 34, gender: 'М', disorder: 'ОКР', severity: 'умеренная', lore: 'Программист, развёлся 2 года назад. Симптомы усилились после развода. Строгий отец в детстве.', avatarLetter: 'А' },
  { id: '2', name: 'Мария', age: 28, gender: 'Ж', disorder: 'ГТР', severity: 'лёгкая', lore: 'Студентка магистратуры. Хроническая тревога перед экзаменами. Гиперответственность.', avatarLetter: 'М' },
  { id: '3', name: 'Дмитрий', age: 41, gender: 'М', disorder: 'Депрессия', severity: 'умеренная', lore: 'Руководитель отдела. Потеря смысла после карьерного успеха. Бессонница 6 мес.', avatarLetter: 'Д' },
  { id: '4', name: 'Елена', age: 35, gender: 'Ж', disorder: 'ПТСР', severity: 'тяжёлая', lore: 'Бывшая медик. Работала в условиях ЧС. Флэшбэки, избегание.', avatarLetter: 'Е' },
]

// ─── Вспомогательные компоненты ──────────────────────────────

function Spinner({ size = 20, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color + '33'} strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
    error: { bg: C.dangerLight, border: '#fca5a5', color: C.danger },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
  }
  const c = colors[type]
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      padding: '12px 18px', borderRadius: C.radius, fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: C.shadowMd,
      animation: 'toastIn 0.3s ease',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>{msg}</span>
      <span onClick={onClose} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.6 }}>✕</span>
    </div>
  )
}

function PatientAvatar({ letter, size = 40, color = C.accent }: { letter: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${C.accentMid})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.4,
    }}>{letter}</div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────
export default function PsychotherapySession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initPatientId = searchParams.get('patient') || MOCK_PATIENTS[0].id

  const [currentPatient, setCurrentPatient] = useState<Patient>(
    MOCK_PATIENTS.find(p => p.id === initPatientId) || MOCK_PATIENTS[0]
  )
  const [session, setSession] = useState<Session>({
    id: 'mock-session-1',
    status: 'active',
    mode: 'psychotherapy',
    startedAt: new Date().toISOString(),
  })
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: `Сессия начата. Режим: Психотерапия. Пациент: ${currentPatient.name}, ${currentPatient.age} лет. Расстройство: ${currentPatient.disorder} (${currentPatient.severity} выраженность).`,
      ts: new Date().toISOString(),
    },
    {
      id: '1',
      role: 'patient',
      content: 'Здравствуйте. Я... не совсем понимаю, зачем снова сюда пришёл. Жена настояла.',
      ts: new Date().toISOString(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [lore, setLore] = useState(currentPatient.lore)
  const [loreEditing, setLoreEditing] = useState(false)
  const [loreSaving, setLoreSaving] = useState(false)
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showEndModal, setShowEndModal] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Таймер
  useEffect(() => {
    if (session.status === 'active') {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session.status])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Переключение пациента
  const switchPatient = (patient: Patient) => {
    if (patient.id === currentPatient.id) return
    setCurrentPatient(patient)
    setLore(patient.lore)
    setMessages([
      {
        id: Date.now().toString(),
        role: 'system',
        content: `Переключение: теперь работаете с ${patient.name}, ${patient.age} лет. Расстройство: ${patient.disorder}.`,
        ts: new Date().toISOString(),
      },
    ])
    setTimerSeconds(0)
    setSession(s => ({ ...s, status: 'active' }))
    showToast(`Открыта сессия с ${patient.name}`, 'info')
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ msg, type })

  // ─── ОТПРАВКА СООБЩЕНИЯ ────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending || session.status !== 'active') return

    setInputText('')
    setSending(true)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'student',
      content: text,
      ts: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      patient: {
        name: currentPatient.name,
        age: currentPatient.age,
        gender: currentPatient.gender || 'не указан',
        disorder: currentPatient.disorder,
        severity: currentPatient.severity || 'moderate',
        lore: currentPatient.lore,
        mode: 'psychotherapy',
        language: 'ru',
      },
      patient_id: currentPatient.id,  // ← ДОБАВЛЕНО
      history: messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'student' ? 'user' : 'assistant',
          content: m.content
        })),
      hints_enabled: hintsEnabled,
    })
  })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Бэкенд вернул ошибку: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      const patientMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'patient',
        content: data.response,
        ts: new Date().toISOString(),
        hint: data.hint || undefined,
      }
      setMessages(prev => [...prev, patientMsg])

    } catch (error) {
      console.error('Ошибка:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `⚠️ Ошибка: ${error instanceof Error ? error.message : 'Не удалось получить ответ от пациента.'}`,
        ts: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [inputText, sending, session, hintsEnabled, currentPatient, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Пауза / возобновление
  const togglePause = async () => {
    const newStatus = session.status === 'active' ? 'paused' : 'active'
    setSession(s => ({ ...s, status: newStatus }))
    showToast(newStatus === 'paused' ? 'Сессия поставлена на паузу' : 'Сессия возобновлена', 'info')
  }

  // Сохранение лора
  const saveLore = async () => {
    setLoreSaving(true)
    try {
      showToast('История пациента обновлена', 'success')
      setLoreEditing(false)
    } catch {
      showToast('Ошибка сохранения', 'error')
    } finally {
      setLoreSaving(false)
    }
  }

  // Экспорт PDF
  const exportPDF = async () => {
    setExportLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      showToast('PDF будет доступен после завершения сессии', 'info')
    } catch {
      showToast('Ошибка генерации PDF', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  // Завершить сессию
  // Завершить сессию с анализом
const endSession = async () => {
  try {
    // 1. Анализируем сессию и сохраняем состояние
    const token = localStorage.getItem('psytrainer_token')
    const response = await fetch(`http://localhost:8001/api/sessions/${session.id}/analyze-state?patient_id=${currentPatient.id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        transcript: messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
        session_score: 70, // Можно вычислить динамически
        disorder: currentPatient.disorder,
        severity_label: currentPatient.severity,
      })
    })

    if (response.ok) {
      const data = await response.json()
      showToast(`Сессия завершена! Прогресс: ${data.progress_pct || 0}%`, 'success')
    } else {
      showToast('Сессия завершена!', 'info')
    }

    navigate('/sessions')
  } catch (error) {
    console.error('Ошибка завершения сессии:', error)
    showToast('Ошибка завершения сессии', 'error')
  }
}

  const otherPatients = MOCK_PATIENTS.filter(p => p.id !== currentPatient.id)
  const mode = session.mode || 'psychotherapy'

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── ЛЕВАЯ ПАНЕЛЬ: другие пациенты ── */}
      <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textMuted, marginBottom: 4 }}>Другие пациенты</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {otherPatients.map(patient => (
            <div key={patient.id} onClick={() => switchPatient(patient)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px', borderRadius: C.radius, cursor: 'pointer',
              marginBottom: 4, transition: 'background 0.15s',
              background: 'transparent',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.accentSoft}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <PatientAvatar letter={patient.avatarLetter} size={36} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{patient.disorder}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => navigate('/simulator')} style={{
            width: '100%', padding: '9px 12px', borderRadius: C.radius,
            border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Назад к выбору
          </button>
        </div>
      </aside>

      {/* ── ЦЕНТР: чат ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <PatientAvatar letter={currentPatient.avatarLetter} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{currentPatient.name}, {currentPatient.age}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {currentPatient.disorder} · {currentPatient.severity} · Психотерапия
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: session.status === 'paused' ? C.warningLight : C.accentSoft,
            border: `1px solid ${session.status === 'paused' ? '#fde68a' : C.accentLight}`,
            borderRadius: 20, fontSize: 13, fontWeight: 700,
            color: session.status === 'paused' ? C.warning : C.accent,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatTime(timerSeconds)}
          </div>

          <button onClick={() => setHintsEnabled(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            borderRadius: 20, border: `1px solid ${hintsEnabled ? C.accentLight : C.border}`,
            background: hintsEnabled ? C.accentSoft : 'transparent',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: hintsEnabled ? C.accent : C.textMuted,
          }}>
            💡 {hintsEnabled ? 'Подсказки вкл' : 'Подсказки выкл'}
          </button>

          <button onClick={togglePause} style={{
            padding: '7px 14px', borderRadius: C.radius, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: session.status === 'paused' ? C.accent : C.textSecondary,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {session.status === 'paused'
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Продолжить</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Пауза</>
            }
          </button>

          <button onClick={exportPDF} disabled={exportLoading} style={{
            padding: '7px 14px', borderRadius: C.radius, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${C.accentLight}`, background: C.accentSoft, color: C.accent,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {exportLoading ? <Spinner size={14} color={C.accent} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            PDF
          </button>

          <button onClick={() => setShowEndModal(true)} style={{
            padding: '7px 14px', borderRadius: C.radius, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: 'none', background: C.accent, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            Завершить
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} patientName={currentPatient.name} patientLetter={currentPatient.avatarLetter} />
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <PatientAvatar letter={currentPatient.avatarLetter} size={32} />
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner size={16} color={C.textMuted} />
                <span style={{ fontSize: 13, color: C.textMuted }}>печатает...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{
          background: C.surface, borderTop: `1px solid ${C.border}`,
          padding: '14px 20px', flexShrink: 0,
        }}>
          {session.status === 'paused' && (
            <div style={{ textAlign: 'center', padding: '8px 0 12px', fontSize: 13, color: C.warning, fontWeight: 600 }}>
              ⏸ Сессия на паузе — нажмите «Продолжить» для отправки сообщений
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение пациенту... (Enter для отправки, Shift+Enter — перенос строки)"
              disabled={session.status !== 'active'}
              rows={2}
              style={{
                flex: 1, resize: 'none', padding: '12px 16px',
                border: `1.5px solid ${C.border}`, borderRadius: C.radiusLg,
                fontSize: 14, fontFamily: 'inherit', color: C.textPrimary,
                background: session.status !== 'active' ? C.bg : C.surface,
                outline: 'none', transition: 'border-color 0.2s',
                lineHeight: 1.5,
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
              onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || sending || session.status !== 'active'}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: inputText.trim() && !sending && session.status === 'active' ? C.accent : C.border,
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}>
              {sending ? <Spinner size={18} /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── ПРАВАЯ ПАНЕЛЬ: история пациента + контроль состояния ── */}
      <aside style={{ width: 280, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>📋 История пациента</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Редактируйте и сохраняйте заметки</div>
        </div>

        <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
          <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '12px', marginBottom: 14 }}>
            {[
              ['Возраст', `${currentPatient.age} лет`],
              ['Пол', currentPatient.gender],
              ['Расстройство', currentPatient.disorder],
              ['Выраженность', currentPatient.severity],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: C.textMuted }}>{label}</span>
                <span style={{ fontWeight: 600, color: C.accent }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Жизненная история</div>
          {loreEditing ? (
            <textarea
              value={lore}
              onChange={e => setLore(e.target.value)}
              rows={8}
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', boxSizing: 'border-box',
                border: `1.5px solid ${C.borderFocus}`, borderRadius: C.radius,
                fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none',
                color: C.textPrimary, background: C.surface,
              }}
            />
          ) : (
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.radius,
              padding: '10px 12px', fontSize: 13, color: C.textSecondary,
              lineHeight: 1.65, cursor: 'pointer', minHeight: 80,
            }} onClick={() => setLoreEditing(true)} title="Нажмите для редактирования">
              {lore || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>Нажмите для добавления истории...</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {loreEditing ? (
              <>
                <button onClick={saveLore} disabled={loreSaving} style={{
                  flex: 2, padding: '9px 0', borderRadius: C.radius, border: 'none',
                  background: C.accent, color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {loreSaving ? <Spinner size={14} /> : '💾'} Сохранить
                </button>
                <button onClick={() => { setLore(currentPatient.lore); setLoreEditing(false) }} style={{
                  flex: 1, padding: '9px 0', borderRadius: C.radius,
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.textSecondary, fontWeight: 500, fontSize: 13, cursor: 'pointer',
                }}>Отмена</button>
              </>
            ) : (
              <button onClick={() => setLoreEditing(true)} style={{
                width: '100%', padding: '9px 0', borderRadius: C.radius,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.textSecondary, fontWeight: 500, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* ── СТАТИСТИКА СЕССИИ ── */}
{/* ── КОНТРОЛЬ ВЫРАЖЕННОСТИ (только для психотерапии) ── */}
{mode === 'psychotherapy' && currentPatient && (
  <div style={{ 
    padding: '12px 16px', 
    borderTop: `1px solid ${C.border}`, 
    maxHeight: '380px', 
    overflowY: 'auto',
    background: C.surface,
  }}>
    <SeverityControl 
      patientId={currentPatient.id}
      sessionId={session.id}
      mode="psychotherapy"
      onLLMParamsChange={(params) => {
        console.log('LLM params updated:', params)
      }}
    />
  </div>
)}

{/* ── ГРАФИК ДИНАМИКИ СОСТОЯНИЯ ── */}
{mode === 'psychotherapy' && currentPatient && (
  <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
    <StateChart patientId={currentPatient.id} height={200} limit={30} />
  </div>
)}

</aside> 
      {/* ── МОДАЛКА ЗАВЕРШЕНИЯ ── */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowEndModal(false)}>
          <div style={{ background: C.surface, borderRadius: C.radiusLg, padding: '32px', maxWidth: 400, width: '90%', boxShadow: C.shadowLg }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Завершить сессию?</div>
            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              После завершения система проведёт анализ сессии и сформирует PDF-отчёт с оценками и фидбэком.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={endSession} style={{
                flex: 2, padding: '12px 0', borderRadius: C.radius, border: 'none',
                background: C.accent, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>Завершить и получить отчёт</button>
              <button onClick={() => setShowEndModal(false)} style={{
                flex: 1, padding: '12px 0', borderRadius: C.radius,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.textSecondary, fontWeight: 500, fontSize: 15, cursor: 'pointer',
              }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Пузырь сообщения ─────────────────────────────────────────
function MessageBubble({ msg, patientName, patientLetter }: { msg: Message; patientName: string; patientLetter: string }) {
  if (msg.role === 'system') {
    return (
      <div style={{ textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', fontSize: 12, color: C.textMuted, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 14px',
        }}>{msg.content}</span>
      </div>
    )
  }

  const isStudent = msg.role === 'student'
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: isStudent ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
        {!isStudent && <PatientAvatar letter={patientLetter} size={32} />}
        <div style={{ maxWidth: '70%' }}>
          {!isStudent && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{patientName}</div>}
          <div style={{
            padding: '12px 16px', borderRadius: isStudent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isStudent ? C.accent : C.surface,
            border: isStudent ? 'none' : `1px solid ${C.border}`,
            color: isStudent ? '#fff' : C.textPrimary,
            fontSize: 14, lineHeight: 1.6,
            boxShadow: C.shadow,
          }}>
            {msg.content}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: isStudent ? 'right' : 'left' }}>
            {new Date(msg.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {isStudent && (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, #334155, #475569)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>В</div>
        )}
      </div>

      {/* Подсказка супервизора */}
      {msg.hint && (
        <div style={{
          marginLeft: 42, marginTop: 8, padding: '10px 14px',
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: C.radius, fontSize: 13, color: '#78350f', lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700 }}>💡 Подсказка: </span>{msg.hint}
        </div>
      )}
    </div>
  )
}