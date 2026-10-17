/**
 * DiagnosticsSession.tsx
 * Чат-страница режима «Диагностика»
 */
 
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'

const C = {
  bg: '#f0fdf4', surface: '#ffffff', surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentHover: '#1b4332', accentLight: '#d8f3dc', accentSoft: '#f0fdf4', accentMid: '#52b788',
  border: '#e2e8f0', borderFocus: '#2d6a4f',
  danger: '#ef4444', dangerLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb',
  amber: '#d97706', amberLight: '#fffbeb',
  shadow: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
  shadowLg: '0 12px 40px rgba(15,23,42,0.12)',
  radius: '12px', radiusLg: '18px',
}

interface Message {
  id: string
  role: 'student' | 'patient' | 'hint' | 'system'
  content: string
  ts: string
  hint?: string
  redFlag?: string
}

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  disorder: string
  severity: string
  lore: string
  avatarLetter: string
  dsm5Criteria: string[]
}

const MOCK_PATIENTS: Patient[] = [
  {
    id: '1', name: 'Алексей', age: 34, gender: 'М', avatarLetter: 'А',
    disorder: 'ОКР', severity: 'умеренная',
    lore: 'Программист, развод 2 года назад. Симптомы усилились. Строгий отец в детстве.',
    dsm5Criteria: [
      'Навязчивые мысли (обсессии)',
      'Компульсивные ритуалы (компульсии)',
      'Ритуалы занимают >1 часа в день',
      'Значительный дистресс',
      'Нарушение социального/профессионального функционирования',
    ],
  },
  {
    id: '2', name: 'Мария', age: 28, gender: 'Ж', avatarLetter: 'М',
    disorder: 'ГТР', severity: 'лёгкая',
    lore: 'Студентка магистратуры. Хроническая тревога. Гиперответственность.',
    dsm5Criteria: [
      'Избыточная тревога ≥6 месяцев',
      'Трудно контролировать беспокойство',
      '≥3 из 6 симптомов (ГТР)',
      'Нарушение функционирования',
      'Тревога не вследствие другого расстройства',
    ],
  },
  {
    id: '3', name: 'Дмитрий', age: 41, gender: 'М', avatarLetter: 'Д',
    disorder: 'Депрессия', severity: 'умеренная',
    lore: 'Руководитель отдела. Потеря смысла. Бессонница 6 мес.',
    dsm5Criteria: [
      'Депрессивное настроение большую часть дня',
      'Ангедония (потеря интереса)',
      'Изменения веса/аппетита',
      'Нарушения сна',
      'Усталость / потеря энергии',
      'Чувство вины / малоценности',
      'Трудности с концентрацией',
      'Мысли о смерти / суицид',
    ],
  },
]

const OTHER_PATIENTS = MOCK_PATIENTS

function Spinner({ size = 18, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
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
    }}>
      {msg}
      <span onClick={onClose} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.6 }}>✕</span>
    </div>
  )
}

function PatientAvatar({ letter, size = 40 }: { letter: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentMid})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.4,
    }}>{letter}</div>
  )
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

const RED_FLAG_TRIGGERS = [
  { words: ['у вас', 'ваш диагноз', 'это шизо', 'это депрес', 'ставлю диаг'], msg: 'Постановка диагноза — этическое нарушение в режиме диагностики' },
  { words: ['назначаю', 'рекомендую принять', 'выпишу', 'нужно пить'], msg: 'Назначение медикаментов — недопустимо для психолога' },
  { words: ['вы должны', 'вам нужно', 'вам надо'], msg: 'Директивная рекомендация без исследования — наводящий вопрос' },
]

function detectRedFlag(text: string): string | null {
  const lower = text.toLowerCase()
  for (const rf of RED_FLAG_TRIGGERS) {
    if (rf.words.some(w => lower.includes(w))) return rf.msg
  }
  return null
}

export default function DiagnosticsSession() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const initId = id || searchParams.get('patient') || MOCK_PATIENTS[0].id

  // ✅ ВСЕ ХУКИ ВЫЗЫВАЮТСЯ ДО ЛЮБОГО return
  const [loading, setLoading] = useState(true)
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)
  
  const [sessionId] = useState('diag-session-1')
  const [sessionStatus, setSessionStatus] = useState<'active' | 'paused' | 'completed'>('active')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [hintsEnabled, setHintsEnabled] = useState(false)
  const [checkedCriteria, setCheckedCriteria] = useState<Set<number>>(new Set())
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [redFlagsCount, setRedFlagsCount] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showEndModal, setShowEndModal] = useState(false)
  const [diagNotes, setDiagNotes] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ✅ Загрузка пациента
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await fetch(`http://localhost:8001/api/patients/${initId}`)
        if (response.ok) {
          const data = await response.json()
          setCurrentPatient({
            id: data.id,
            name: data.name,
            age: data.age,
            gender: data.gender,
            disorder: data.disorder,
            severity: data.severity,
            lore: data.lore,
            avatarLetter: data.name[0].toUpperCase(),
            dsm5Criteria: [
              'Навязчивые мысли (обсессии)',
              'Компульсивные ритуалы (компульсии)',
              'Ритуалы занимают >1 часа в день',
              'Значительный дистресс',
              'Нарушение социального/профессионального функционирования',
            ],
          })
        } else {
          const mock = MOCK_PATIENTS.find(p => p.id === initId) || MOCK_PATIENTS[0]
          setCurrentPatient(mock)
        }
      } catch {
        const mock = MOCK_PATIENTS.find(p => p.id === initId) || MOCK_PATIENTS[0]
        setCurrentPatient(mock)
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [initId])

  // ✅ Установка начальных сообщений
  useEffect(() => {
    if (currentPatient && messages.length === 0) {
      setMessages([
        {
          id: '0', role: 'system', ts: new Date().toISOString(),
          content: `Диагностическая сессия начата. Пациент: ${currentPatient.name}. Предполагаемое расстройство: ${currentPatient.disorder}.`,
        },
        {
          id: '1', role: 'patient', ts: new Date().toISOString(),
          content: 'Добрый день. Я не совсем понимаю, зачем пришёл... Жена говорит, что я стал "странным". Могу объяснить?',
        },
      ])
    }
  }, [currentPatient, messages.length])

  // ✅ Таймер
  useEffect(() => {
    if (sessionStatus !== 'active') return
    const t = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [sessionStatus])

  // ✅ Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ✅ ОТПРАВКА СООБЩЕНИЯ
  const sendMessage = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending || sessionStatus !== 'active') return

    setInputText('')
    setSending(true)

    const flag = detectRedFlag(text)
    if (flag) {
      setRedFlagsCount(c => c + 1)
      showToast(`🚨 Красный флаг: ${flag}`, 'error')
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'student',
      ts: new Date().toISOString(),
      content: text,
      redFlag: flag || undefined,
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const API_URL = 'http://localhost:8001'
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          patient: {
            name: currentPatient?.name || 'Пациент',
            age: currentPatient?.age || 30,
            gender: currentPatient?.gender || 'не указан',
            disorder: currentPatient?.disorder || 'Не указано',
            severity: currentPatient?.severity || 'moderate',
            lore: currentPatient?.lore || '',
            mode: 'diagnostics',
            language: 'ru',
          },
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
        ts: new Date().toISOString(),
        content: data.response,
        hint: data.hint || undefined,
      }
      setMessages(prev => [...prev, patientMsg])

    } catch (error) {
      console.error('Ошибка:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        ts: new Date().toISOString(),
        content: `⚠️ Ошибка: ${error instanceof Error ? error.message : 'Не удалось получить ответ от пациента.'}`,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [inputText, sending, sessionStatus, hintsEnabled, currentPatient, messages])

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ msg, type })

  const switchPatient = (p: Patient) => {
    setCurrentPatient(p)
    setCheckedCriteria(new Set())
    setMessages([{ id: Date.now().toString(), role: 'system', ts: new Date().toISOString(), content: `Переключение к пациенту: ${p.name}, ${p.age} лет.` }])
    setTimerSeconds(0)
    setRedFlagsCount(0)
    setDiagNotes('')
    showToast(`Сессия с ${p.name}`, 'info')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const toggleCriterion = (idx: number) => {
    setCheckedCriteria(prev => {
      const n = new Set(prev)
      n.has(idx) ? n.delete(idx) : n.add(idx)
      return n
    })
  }

  const exportPDF = async () => {
    setExportLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    showToast('PDF будет готов после завершения сессии', 'info')
    setExportLoading(false)
  }

  // ✅ РАННИЙ ВОЗВРАТ ТОЛЬКО ПОСЛЕ ВСЕХ ХУКОВ
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка пациента...</div>
  }

  if (!currentPatient) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Пациент не найден</div>
  }

  const otherPatients = MOCK_PATIENTS.filter(p => p.id !== currentPatient.id)
  const criteriaProgress = currentPatient.dsm5Criteria.length > 0
    ? Math.round((checkedCriteria.size / currentPatient.dsm5Criteria.length) * 100)
    : 0

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── ЛЕВАЯ ПАНЕЛЬ ── */}
      <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textMuted }}>Другие пациенты</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {otherPatients.map(p => (
            <div key={p.id} onClick={() => switchPatient(p)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: C.radius,
              cursor: 'pointer', marginBottom: 4, transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.accentSoft}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <PatientAvatar letter={p.avatarLetter} size={36} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{p.disorder}</div>
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
            Назад
          </button>
        </div>
      </aside>

      {/* ── ЦЕНТР: чат ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Шапка */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <PatientAvatar letter={currentPatient.avatarLetter} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{currentPatient.name}, {currentPatient.age}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Диагностика · Предположение: {currentPatient.disorder}</div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: 20,
            fontSize: 13, fontWeight: 700, color: C.accent,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatTime(timerSeconds)}
          </div>

          {redFlagsCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              background: C.dangerLight, border: '1px solid #fca5a5', borderRadius: 20,
              fontSize: 13, fontWeight: 700, color: C.danger,
            }}>
              🚨 {redFlagsCount} {redFlagsCount === 1 ? 'нарушение' : 'нарушения'}
            </div>
          )}

          <button onClick={() => setHintsEnabled(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
            border: `1px solid ${hintsEnabled ? C.accentLight : C.border}`,
            background: hintsEnabled ? C.accentSoft : 'transparent',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: hintsEnabled ? C.accent : C.textMuted,
          }}>
            🔍 {hintsEnabled ? 'Режим помощи' : 'Погружение'}
          </button>

          <button onClick={exportPDF} disabled={exportLoading} style={{
            padding: '7px 14px', borderRadius: C.radius, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${C.accentLight}`, background: C.accentSoft, color: C.accent,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {exportLoading ? <Spinner size={14} color={C.accent} /> : '📥'} PDF
          </button>

          <button onClick={() => setShowEndModal(true)} style={{
            padding: '7px 14px', borderRadius: C.radius, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: 'none', background: C.accent, color: '#fff',
          }}>
            Завершить
          </button>
        </div>

        {/* Сообщения */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => (
            <DiagMessageBubble key={msg.id} msg={msg} patientName={currentPatient.name} patientLetter={currentPatient.avatarLetter} />
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <PatientAvatar letter={currentPatient.avatarLetter} size={32} />
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Spinner size={16} color={C.textMuted} />
                <span style={{ fontSize: 13, color: C.textMuted }}>печатает...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Ввод */}
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '14px 20px', flexShrink: 0 }}>
          {!hintsEnabled && (
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              🔍 Режим полного погружения — подсказки отключены
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задайте диагностический вопрос... (Enter — отправить)"
              rows={2}
              style={{
                flex: 1, resize: 'none', padding: '12px 16px',
                border: `1.5px solid ${C.border}`, borderRadius: C.radiusLg,
                fontSize: 14, fontFamily: 'inherit', color: C.textPrimary,
                background: C.surface, outline: 'none', lineHeight: 1.5,
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
              onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
            />
            <button onClick={sendMessage} disabled={!inputText.trim() || sending} style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              background: inputText.trim() && !sending ? C.accent : C.border,
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

      {/* ── ПРАВАЯ ПАНЕЛЬ: диагностика ── */}
      <aside style={{ width: 280, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>🔎 Чеклист DSM-5</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{currentPatient.disorder}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {/* Прогресс */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: C.textMuted }}>Критерии выявлены</span>
              <span style={{ fontWeight: 700, color: C.accent }}>{checkedCriteria.size}/{currentPatient.dsm5Criteria.length}</span>
            </div>
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.accentMid})`, borderRadius: 3, width: `${criteriaProgress}%`, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Критерии */}
          {currentPatient.dsm5Criteria.map((criterion, idx) => (
            <div key={idx} onClick={() => toggleCriterion(idx)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px',
              borderRadius: 8, cursor: 'pointer', marginBottom: 4,
              background: checkedCriteria.has(idx) ? C.accentSoft : 'transparent',
              border: `1px solid ${checkedCriteria.has(idx) ? C.accentLight : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${checkedCriteria.has(idx) ? C.accent : C.border}`,
                background: checkedCriteria.has(idx) ? C.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {checkedCriteria.has(idx) && (
                  <svg width="10" height="9" viewBox="0 0 10 9" fill="none">
                    <path d="M1 4.5L3.5 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: checkedCriteria.has(idx) ? C.accent : C.textSecondary, fontWeight: checkedCriteria.has(idx) ? 500 : 400, lineHeight: 1.4 }}>
                {criterion}
              </span>
            </div>
          ))}

          {/* Заметки */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Диагностические заметки</div>
            <textarea
              value={diagNotes}
              onChange={e => setDiagNotes(e.target.value)}
              placeholder="Ваши наблюдения, предположения, уточняющие вопросы..."
              rows={4}
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', boxSizing: 'border-box',
                border: `1.5px solid ${C.border}`, borderRadius: C.radius,
                fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none',
                color: C.textPrimary, background: C.bg,
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
              onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
            />
          </div>

          {redFlagsCount > 0 && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: C.dangerLight, border: '1px solid #fca5a5', borderRadius: C.radius,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.danger, marginBottom: 4 }}>
                🚨 Нарушений: {redFlagsCount}
              </div>
              <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
                В режиме диагностики нельзя: ставить диагнозы, назначать лечение, давать директивные рекомендации.
              </div>
            </div>
          )}
        </div>

        {/* Статистика */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Вопросов', messages.filter(m => m.role === 'student').length],
              ['Ответов', messages.filter(m => m.role === 'patient').length],
              ['Критериев', `${checkedCriteria.size}/${currentPatient.dsm5Criteria.length}`],
              ['Флагов', redFlagsCount],
            ].map(([label, value]) => (
              <div key={String(label)} style={{
                borderRadius: 8,
                padding: '8px 10px',
                border: label === 'Флагов' && Number(value) > 0 ? `1px solid #fca5a5` : 'none',
                background: label === 'Флагов' && Number(value) > 0 ? C.dangerLight : C.bg,
              }}>
                <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: label === 'Флагов' && Number(value) > 0 ? C.danger : C.textPrimary,
                  marginTop: 2,
                }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Модалка завершения */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowEndModal(false)}>
          <div style={{ background: C.surface, borderRadius: C.radiusLg, padding: '32px', maxWidth: 420, width: '90%', boxShadow: C.shadowLg }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Завершить диагностику?</div>
            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Выявлено критериев: <strong>{checkedCriteria.size} из {currentPatient.dsm5Criteria.length}</strong>.
              {redFlagsCount > 0 && <span style={{ color: C.danger }}> Нарушений: {redFlagsCount}.</span>}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => navigate(`/session/${sessionId}/report`)} style={{
                flex: 2, padding: '12px 0', borderRadius: C.radius, border: 'none',
                background: C.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>Завершить и получить отчёт</button>
              <button onClick={() => setShowEndModal(false)} style={{
                flex: 1, padding: '12px 0', borderRadius: C.radius,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.textSecondary, fontWeight: 500, fontSize: 14, cursor: 'pointer',
              }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DiagMessageBubble({ msg, patientName, patientLetter }: { msg: Message; patientName: string; patientLetter: string }) {
  if (msg.role === 'system') return (
    <div style={{ textAlign: 'center' }}>
      <span style={{ display: 'inline-block', fontSize: 12, color: C.textMuted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 14px' }}>{msg.content}</span>
    </div>
  )
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
            color: isStudent ? '#fff' : C.textPrimary, fontSize: 14, lineHeight: 1.6,
          }}>
            {msg.content}
          </div>
          {msg.redFlag && (
            <div style={{ marginTop: 6, padding: '6px 12px', background: C.dangerLight, border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: C.danger }}>
              🚨 {msg.redFlag}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: isStudent ? 'right' : 'left' }}>
            {new Date(msg.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {isStudent && (
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #334155, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>В</div>
        )}
      </div>
      {msg.hint && (
        <div style={{ marginLeft: 42, marginTop: 8, padding: '10px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: C.radius, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>🔍 Диагн. подсказка: </span>{msg.hint}
        </div>
      )}
    </div>
  )
}