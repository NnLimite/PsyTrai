/**
 * SessionsPage.tsx — /sessions
 * Мои сессии: история, фильтры, просмотр с AI-оценкой реплик, выгрузка PDF
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Дизайн-токены ────────────────────────────────────────────
const C = {
  bg: '#f0fdf4', surface: '#ffffff', surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentMid: '#52b788', accentLight: '#d8f3dc', accentSoft: '#f0fdf4',
  border: '#e2e8f0', borderFocus: '#2d6a4f',
  danger: '#ef4444', dangerLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb',
  success: '#16a34a', successLight: '#f0fdf4',
  blue: '#3b82f6', blueLight: '#eff6ff',
  purple: '#7c3aed', purpleLight: '#f5f3ff',
  shadow: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
  shadowLg: '0 12px 40px rgba(15,23,42,0.12)',
  radius: '12px', radiusLg: '18px', radiusXl: '24px',
}

// ─── Типы ─────────────────────────────────────────────────────
type SessionStatus = 'completed' | 'active' | 'paused'
type SessionMode = 'diagnostics' | 'psychotherapy'

interface MessageEval {
  id: number
  role: 'student' | 'patient'
  content: string
  ts: string
  score?: number           // 0-100 для реплик студента
  category?: 'empathy' | 'question' | 'ethics' | 'interpretation' | 'red_flag'
  recommendation?: string  // AI-рекомендация
  highlight?: 'good' | 'warn' | 'bad'
}

interface SessionReport {
  scoreQuestions: number
  scoreEmpathy: number
  scoreEthics: number
  scoreInterpretation: number
  scoreOverall: number
  feedbackText: string
  redFlagsCount: number
}

interface Session {
  id: string
  patientName: string
  patientLetter: string
  disorder: string
  mode: SessionMode
  status: SessionStatus
  startedAt: string
  completedAt?: string
  durationMin: number
  messagesCount: number
  report?: SessionReport
  messages: MessageEval[]
  language: 'ru' | 'en'
}

// ─── Мок-данные ───────────────────────────────────────────────
const MOCK_SESSIONS: Session[] = [
  {
    id: 's1', patientName: 'Алексей', patientLetter: 'А', disorder: 'ОКР', mode: 'diagnostics',
    status: 'completed', startedAt: '2026-08-24T10:15:00Z', completedAt: '2026-08-24T10:52:00Z',
    durationMin: 37, messagesCount: 22, language: 'ru',
    report: { scoreQuestions: 72, scoreEmpathy: 65, scoreEthics: 90, scoreInterpretation: 58, scoreOverall: 71, feedbackText: 'Хорошая работа с открытыми вопросами. Следует больше уделять внимания отражению эмоций пациента. Интерпретации в 3 случаях опережали материал клиента — важно выдерживать паузу.', redFlagsCount: 1 },
    messages: [
      { id: 1, role: 'student', content: 'Расскажите, что именно вас беспокоит?', ts: '10:15', score: 85, category: 'question', highlight: 'good', recommendation: 'Отличный открытый вопрос — даёт пациенту пространство для ответа.' },
      { id: 2, role: 'patient', content: 'Я снова опоздал на работу... проверял замок восемь раз.', ts: '10:16' },
      { id: 3, role: 'student', content: 'Как вы себя чувствуете, когда делаете это?', ts: '10:17', score: 78, category: 'empathy', highlight: 'good', recommendation: 'Хороший вопрос на чувства. Попробуйте добавить отражение: «Звучит утомительно...»' },
      { id: 4, role: 'patient', content: 'Плохо. Тревожно. Но если не проверю — станет ещё хуже.', ts: '10:18' },
      { id: 5, role: 'student', content: 'Это потому что у вас ОКР — навязчивое расстройство.', ts: '10:19', score: 12, category: 'red_flag', highlight: 'bad', recommendation: '🚨 КРАСНЫЙ ФЛАГ: Постановка диагноза в режиме диагностики недопустима. Никогда не называйте диагноз пациенту — это нарушение профессиональной этики.' },
      { id: 6, role: 'patient', content: 'Да? Я... не знал. Это лечится?', ts: '10:20' },
      { id: 7, role: 'student', content: 'Когда это началось впервые? Расскажите об этом подробнее.', ts: '10:22', score: 88, category: 'question', highlight: 'good', recommendation: 'Грамотное переключение на сбор анамнеза.' },
      { id: 8, role: 'patient', content: 'Лет в 20, после смерти папы. Он всегда говорил — проверяй всё дважды.', ts: '10:23' },
      { id: 9, role: 'student', content: 'Значит, это связано с папой — он вас этому научил.', ts: '10:24', score: 38, category: 'interpretation', highlight: 'warn', recommendation: 'Преждевременная интерпретация. Пациент не подтвердил связь — сначала исследуйте: «Как вы сами это понимаете?»' },
    ],
  },
  {
    id: 's2', patientName: 'Мария', patientLetter: 'М', disorder: 'ГТР', mode: 'psychotherapy',
    status: 'completed', startedAt: '2026-08-22T14:00:00Z', completedAt: '2026-08-22T14:48:00Z',
    durationMin: 48, messagesCount: 31, language: 'ru',
    report: { scoreQuestions: 84, scoreEmpathy: 88, scoreEthics: 95, scoreInterpretation: 76, scoreOverall: 86, feedbackText: 'Отличная работа с эмпатическими откликами. Хорошо удерживали фокус на переживаниях клиентки. Рекомендуется развивать навык работы с соматическими проявлениями тревоги.', redFlagsCount: 0 },
    messages: [
      { id: 1, role: 'student', content: 'Как прошла эта неделя для вас?', ts: '14:00', score: 80, category: 'question', highlight: 'good', recommendation: 'Хороший открытый старт сессии.' },
      { id: 2, role: 'patient', content: 'Ужасно. Перед экзаменом совсем не сплю.', ts: '14:01' },
      { id: 3, role: 'student', content: 'Звучит очень тяжело. Не спать перед важным событием — это изматывает.', ts: '14:02', score: 92, category: 'empathy', highlight: 'good', recommendation: 'Превосходное отражение — и эмоций, и физического состояния. Именно так.' },
      { id: 4, role: 'patient', content: 'Да, я уже ничего не чувствую, просто механически что-то делаю.', ts: '14:03' },
      { id: 5, role: 'student', content: 'Что за чувство — делать что-то «механически»? Расскажите больше.', ts: '14:04', score: 85, category: 'question', highlight: 'good', recommendation: 'Отличное углубление в феноменологию — исследуете субъективный опыт.' },
    ],
  },
  {
    id: 's3', patientName: 'Дмитрий', patientLetter: 'Д', disorder: 'Депрессия', mode: 'psychotherapy',
    status: 'paused', startedAt: '2026-08-26T09:30:00Z',
    durationMin: 15, messagesCount: 8, language: 'ru',
    messages: [
      { id: 1, role: 'student', content: 'Добрый день. С чего начнём сегодня?', ts: '09:30', score: 75, category: 'question', highlight: 'good' },
      { id: 2, role: 'patient', content: 'Не знаю. Всё как обычно — серо.', ts: '09:31' },
    ],
  },
  {
    id: 's4', patientName: 'Елена', patientLetter: 'Е', disorder: 'ПТСР', mode: 'diagnostics',
    status: 'completed', startedAt: '2026-08-20T16:00:00Z', completedAt: '2026-08-20T16:55:00Z',
    durationMin: 55, messagesCount: 28, language: 'ru',
    report: { scoreQuestions: 68, scoreEmpathy: 74, scoreEthics: 82, scoreInterpretation: 61, scoreOverall: 71, feedbackText: 'Важно: при работе с травматическим материалом скорость продвижения должна определяться клиентом. В двух случаях вопросы были заданы слишком директивно.', redFlagsCount: 2 },
    messages: [],
  },
]

// ─── Вспомогательные компоненты ───────────────────────────────

function Spinner({ size = 18, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color + '33'} strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function ScoreRing({ score, label, size = 72, color }: { score: number; label: string; size?: number; color?: string }) {
  const c = color || (score >= 75 ? C.success : score >= 50 ? C.warning : C.danger)
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4} transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          fill={c} fontSize={size * 0.24} fontWeight="800" fontFamily="system-ui">{Math.round(score)}</text>
      </svg>
      <span style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const cfg = {
    completed: { color: C.success, bg: C.successLight, border: '#86efac', label: '✓ Завершена' },
    active:    { color: C.accent,  bg: C.accentSoft,   border: C.accentLight, label: '● Активна' },
    paused:    { color: C.warning, bg: C.warningLight,  border: '#fde68a',    label: '⏸ Пауза' },
  }
  const c = cfg[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {c.label}
    </span>
  )
}

function ModeBadge({ mode }: { mode: SessionMode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: mode === 'diagnostics' ? C.blueLight : C.purpleLight, color: mode === 'diagnostics' ? C.blue : C.purple }}>
      {mode === 'diagnostics' ? '🔍 Диагностика' : '💬 Психотерапия'}
    </span>
  )
}

function PatientAvatar({ letter, size = 40 }: { letter: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C.accent}, ${C.accentMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.4 }}>{letter}</div>
  )
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'|'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  const colors = { success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' }, error: { bg: C.dangerLight, border: '#fca5a5', color: C.danger }, info: { bg: C.blueLight, border: '#93c5fd', color: C.blue } }
  const cl = colors[type]
  return <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: cl.bg, border: `1px solid ${cl.border}`, color: cl.color, padding: '12px 18px', borderRadius: C.radius, fontSize: 14, fontWeight: 500, boxShadow: C.shadowMd, display: 'flex', alignItems: 'center', gap: 10 }}>{msg}<span onClick={onClose} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.6 }}>✕</span></div>
}

// ─── HIGHLIGHT цвет для реплики ───────────────────────────────
function highlightStyle(h?: 'good' | 'warn' | 'bad') {
  if (!h) return {}
  return {
    good: { borderLeft: `3px solid ${C.success}`, background: C.successLight },
    warn: { borderLeft: `3px solid ${C.warning}`, background: C.warningLight },
    bad:  { borderLeft: `3px solid ${C.danger}`,  background: C.dangerLight },
  }[h]
}

function categoryLabel(cat?: string) {
  if (!cat) return null
  const map: Record<string, { icon: string; label: string; color: string }> = {
    empathy:        { icon: '💚', label: 'Эмпатия',        color: C.success },
    question:       { icon: '❓', label: 'Вопрос',          color: C.blue },
    ethics:         { icon: '⚖️', label: 'Этика',           color: C.accent },
    interpretation: { icon: '🔮', label: 'Интерпретация',   color: C.purple },
    red_flag:       { icon: '🚨', label: 'Красный флаг',    color: C.danger },
  }
  return map[cat] || null
}

// ─── DRAWER с транскриптом и оценками ─────────────────────────
function SessionDrawer({ session, onClose, onExportPDF }: { session: Session; onClose: () => void; onExportPDF: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'report' | 'transcript'>('report')
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }} onClick={onClose}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div style={{ width: 580, background: C.surface, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: C.shadowLg }} onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0, background: C.accentSoft }}>
          <PatientAvatar letter={session.patientLetter} size={48} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: C.textPrimary }}>{session.patientName}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ModeBadge mode={session.mode} />
              <StatusBadge status={session.status} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary }}>{session.disorder}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
              {new Date(session.startedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })} · {session.durationMin} мин · {session.messagesCount} реплик
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onExportPDF(session.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: C.radius, border: `1px solid ${C.accentLight}`, background: C.surface, color: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              📥 PDF
            </button>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            { id: 'report', label: '📊 Отчёт и оценки' },
            { id: 'transcript', label: '💬 Транскрипт с разбором' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ flex: 1, padding: '13px 0', border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: activeTab === tab.id ? C.accent : C.textSecondary, borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`, transition: 'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Содержимое */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

          {/* ── ОТЧЁТ ── */}
          {activeTab === 'report' && session.report && (
            <div>
              {/* Итоговый балл */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <ScoreRing score={session.report.scoreOverall} label="Итоговый балл" size={96} color={session.report.scoreOverall >= 75 ? C.success : session.report.scoreOverall >= 50 ? C.warning : C.danger} />
              </div>

              {/* Детальные оценки */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                <ScoreRing score={session.report.scoreQuestions}      label="Вопросы"       size={68} />
                <ScoreRing score={session.report.scoreEmpathy}        label="Эмпатия"        size={68} />
                <ScoreRing score={session.report.scoreEthics}         label="Этика"          size={68} />
                <ScoreRing score={session.report.scoreInterpretation} label="Интерпретация"  size={68} />
              </div>

              {/* Фидбэк AI */}
              <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 8 }}>🤖 AI-фидбэк по сессии</div>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{session.report.feedbackText}</p>
              </div>

              {/* Красные флаги */}
              {session.report.redFlagsCount > 0 && (
                <div style={{ background: C.dangerLight, border: '1px solid #fca5a5', borderRadius: C.radius, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.danger, marginBottom: 6 }}>🚨 Нарушений этики: {session.report.redFlagsCount}</div>
                  <p style={{ fontSize: 13, color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
                    Перейдите во вкладку «Транскрипт» — нарушения выделены красным с подробным объяснением.
                  </p>
                </div>
              )}

              {/* Что улучшить */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, marginBottom: 12 }}>💡 Рекомендации для следующей сессии</div>
                {[
                  { icon: '✅', text: 'Продолжайте использовать открытые вопросы — это ваша сильная сторона.' },
                  { icon: '📈', text: 'Работайте над скоростью: дайте клиенту больше пространства до интерпретации.' },
                  { icon: '🎯', text: 'Практикуйте технику отражения эмоций: называйте чувства клиента вслух.' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 15 }}>{r.icon}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ТРАНСКРИПТ ── */}
          {activeTab === 'transcript' && (
            <div>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                Нажмите на реплику консультанта, чтобы увидеть AI-оценку и рекомендации. Цветная полоска слева показывает качество реплики.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {session.messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === 'patient' ? (
                      // Реплика пациента
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <PatientAvatar letter={session.patientLetter} size={28} />
                        <div style={{ flex: 1, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: '12px 12px 12px 4px', padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{session.patientName} · {msg.ts}</div>
                          <div style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.6 }}>{msg.content}</div>
                        </div>
                      </div>
                    ) : (
                      // Реплика студента — кликабельная
                      <div>
                        <div onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'flex-end', cursor: msg.recommendation ? 'pointer' : 'default' }}>
                          <div style={{ flex: 1, maxWidth: '80%', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', transition: 'all 0.15s', ...highlightStyle(msg.highlight), background: msg.highlight ? undefined : `linear-gradient(135deg, ${C.accent}, ${C.accentMid})`, }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: msg.highlight ? C.textMuted : 'rgba(255,255,255,0.7)' }}>Вы · {msg.ts}</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {msg.score !== undefined && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: msg.highlight === 'bad' ? C.danger : msg.highlight === 'warn' ? C.warning : C.success, color: '#fff' }}>
                                    {msg.score}
                                  </span>
                                )}
                                {msg.category && categoryLabel(msg.category) && (
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: msg.highlight ? C.textSecondary : '#fff' }}>
                                    {categoryLabel(msg.category)?.icon} {categoryLabel(msg.category)?.label}
                                  </span>
                                )}
                                {msg.recommendation && (
                                  <span style={{ fontSize: 11, color: msg.highlight ? C.textMuted : 'rgba(255,255,255,0.7)' }}>{expandedMsg === msg.id ? '▲' : '▼'}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 14, color: msg.highlight ? C.textPrimary : '#fff', lineHeight: 1.6 }}>{msg.content}</div>
                          </div>
                        </div>

                        {/* AI-рекомендация */}
                        {expandedMsg === msg.id && msg.recommendation && (
                          <div style={{ marginTop: 6, marginLeft: 16, padding: '12px 14px', borderRadius: C.radius, background: msg.highlight === 'bad' ? '#fef2f2' : msg.highlight === 'warn' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${msg.highlight === 'bad' ? '#fca5a5' : msg.highlight === 'warn' ? '#fde68a' : '#86efac'}`, fontSize: 13, lineHeight: 1.6, color: msg.highlight === 'bad' ? '#7f1d1d' : msg.highlight === 'warn' ? '#78350f' : '#166534' }}>
                            <span style={{ fontWeight: 700 }}>🤖 AI: </span>{msg.recommendation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {session.messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 14 }}>Транскрипт пуст или сессия ещё не завершена</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Нет отчёта */}
          {activeTab === 'report' && !session.report && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>Отчёт ещё не готов</div>
              <div style={{ fontSize: 14 }}>Сессия должна быть завершена для получения AI-анализа</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── КАРТОЧКА СЕССИИ ──────────────────────────────────────────
function SessionCard({ session, onView, onExportPDF, onContinue }: { session: Session; onView: () => void; onExportPDF: () => void; onContinue: () => void }) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePDF = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPdfLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    onExportPDF()
    setPdfLoading(false)
  }

  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })

  return (
    <div onClick={onView} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: C.shadow }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadowMd; (e.currentTarget as HTMLElement).style.borderColor = C.accentLight }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadow; (e.currentTarget as HTMLElement).style.borderColor = C.border }}>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <PatientAvatar letter={session.patientLetter} size={48} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.textPrimary }}>{session.patientName}</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>{session.disorder}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <StatusBadge status={session.status} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <ModeBadge mode={session.mode} />
            <span style={{ fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
              📅 {dateStr}, {timeStr}
            </span>
            <span style={{ fontSize: 12, color: C.textMuted }}>⏱ {session.durationMin} мин</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>💬 {session.messagesCount} реплик</span>
          </div>

          {/* Мини-оценки */}
          {session.report && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: session.report.scoreOverall >= 75 ? C.successLight : session.report.scoreOverall >= 50 ? C.warningLight : C.dangerLight, border: `2px solid ${session.report.scoreOverall >= 75 ? C.success : session.report.scoreOverall >= 50 ? C.warning : C.danger}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: session.report.scoreOverall >= 75 ? C.success : session.report.scoreOverall >= 50 ? C.warning : C.danger }}>
                  {Math.round(session.report.scoreOverall)}
                </div>
                <span style={{ fontSize: 12, color: C.textMuted }}>/ 100</span>
              </div>
              {[
                { label: 'Вопр', value: session.report.scoreQuestions },
                { label: 'Эмп', value: session.report.scoreEmpathy },
                { label: 'Этика', value: session.report.scoreEthics },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{s.label}</span>
                  <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.value}%`, background: s.value >= 75 ? C.success : s.value >= 50 ? C.warning : C.danger, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
              {session.report.redFlagsCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: C.danger, background: C.dangerLight, padding: '2px 8px', borderRadius: 20, border: '1px solid #fca5a5' }}>
                  🚨 {session.report.redFlagsCount} нарушения
                </span>
              )}
            </div>
          )}

          {session.status === 'paused' && !session.report && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.warning, background: C.warningLight, padding: '4px 10px', borderRadius: 20, border: '1px solid #fde68a' }}>
              ⏸ Сессия на паузе — нажмите «Продолжить»
            </div>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onView} style={{ flex: 1, padding: '9px 0', borderRadius: C.radius, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {session.report ? '📊 Просмотреть отчёт' : '💬 Просмотреть сессию'}
        </button>

        {session.status !== 'completed' && (
          <button onClick={e => { e.stopPropagation(); onContinue() }} style={{ flex: 1, padding: '9px 0', borderRadius: C.radius, border: 'none', background: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ▶ Продолжить
          </button>
        )}

        {session.report && (
          <button onClick={handlePDF} disabled={pdfLoading} style={{ padding: '9px 16px', borderRadius: C.radius, border: `1px solid ${C.accentLight}`, background: C.accentSoft, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            {pdfLoading ? <Spinner size={14} color={C.accent} /> : '📥'} PDF
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ГЛАВНАЯ СТРАНИЦА ─────────────────────────────────────────
export default function SessionsPage() {
  const navigate = useNavigate()
  const [sessions] = useState<Session[]>(MOCK_SESSIONS)
  const [filter, setFilter] = useState<'all' | SessionStatus | SessionMode>('all')
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ msg, type })

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.patientName.toLowerCase().includes(search.toLowerCase()) || s.disorder.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || s.status === filter || s.mode === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    avgScore: Math.round(sessions.filter(s => s.report).reduce((acc, s) => acc + (s.report?.scoreOverall || 0), 0) / sessions.filter(s => s.report).length) || 0,
    totalMin: sessions.reduce((acc, s) => acc + s.durationMin, 0),
  }

  const handleExportPDF = (id: string) => {
    showToast('PDF формируется... Скачивание начнётся через несколько секунд', 'info')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {selectedSession && <SessionDrawer session={selectedSession} onClose={() => setSelectedSession(null)} onExportPDF={handleExportPDF} />}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px' }}>

        {/* Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', margin: '0 0 4px', color: C.textPrimary }}>Мои сессии</h1>
            <p style={{ color: C.textSecondary, fontSize: 15, margin: 0 }}>История тренировок с AI-анализом каждой</p>
          </div>
          <button onClick={() => navigate('/simulator')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: C.radiusLg, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 16px rgba(45,106,79,0.3)` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
            Новая сессия
          </button>
        </div>

        {/* Статистика */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { value: stats.total, label: 'Всего сессий', icon: '📋', color: C.accent },
            { value: stats.completed, label: 'Завершено', icon: '✅', color: C.success },
            { value: stats.avgScore, label: 'Средний балл', icon: '⭐', color: C.warning },
            { value: `${stats.totalMin} мин`, label: 'Время практики', icon: '⏱', color: C.blue },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '16px 18px', boxShadow: C.shadow }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Фильтры + поиск */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по пациенту или расстройству..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, fontSize: 14, fontFamily: 'inherit', color: C.textPrimary, background: C.surface, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
              onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Все' },
              { id: 'completed', label: '✓ Завершённые' },
              { id: 'paused', label: '⏸ На паузе' },
              { id: 'diagnostics', label: '🔍 Диагностика' },
              { id: 'psychotherapy', label: '💬 Психотерапия' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id as any)} style={{
                padding: '9px 14px', borderRadius: C.radius, border: `1px solid ${filter === f.id ? C.accent : C.border}`,
                background: filter === f.id ? C.accentSoft : C.surface,
                color: filter === f.id ? C.accent : C.textSecondary,
                fontWeight: filter === f.id ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Список сессий */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textMuted }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Сессии не найдены</div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>Попробуйте изменить фильтры или начните новую сессию</div>
            <button onClick={() => navigate('/simulator')} style={{ padding: '12px 24px', borderRadius: C.radiusLg, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Начать первую сессию
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(s => (
              <SessionCard key={s.id} session={s}
                onView={() => setSelectedSession(s)}
                onExportPDF={() => handleExportPDF(s.id)}
                onContinue={() => navigate(`/session/${s.id}?mode=${s.mode}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}