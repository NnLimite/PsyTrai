/**
 * SeverityControl.tsx
 * Панель управления выраженностью симптомов и динамическим состоянием пациента.
 * Встраивается в правую колонку страницы сессии.
 *
 * ✅ Все критерии из User Story:
 *   - Слайдер с мгновенным применением
 *   - Визуальный индикатор (зелёный→жёлтый→красный)
 *   - 5 детальных метрик
 *   - 4 предустановленных уровня
 *   - Динамическое состояние (openness, trust, distress, symptom, motivation)
 *   - Стадии терапии (resistance → exploration → insight → integration)
 *   - Предупреждения при >80%
 *   - История изменений
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'

// ─── Цвета ────────────────────────────────────────────────────
const C = {
  surface: '#ffffff', surfaceAlt: '#f8fafc', bg: '#f0fdf4',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentLight: '#d8f3dc', accentSoft: '#f0fdf4', accentMid: '#52b788',
  border: '#e2e8f0',
  danger: '#ef4444', dangerLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb',
  success: '#16a34a', successLight: '#f0fdf4',
  blue: '#3b82f6',
  purple: '#7c3aed',
}

// ─── Типы ─────────────────────────────────────────────────────
export interface SeverityMetrics {
  total: number             // 0-95
  intensity: number         // 0-100
  reactivity: number        // 0-100
  cognitive_distortions: number
  social_isolation: number
  suicidal_ideation: number
}

export interface DynamicState {
  openness: number
  trust: number
  distress: number
  symptom_level: number
  motivation: number
}

interface LLMParams {
  temperature: number
  top_p: number
  max_tokens: number
  style: string
  description: string
}

interface PatientState {
  severity: SeverityMetrics
  dynamic: DynamicState
  stage: string
  stage_label: string
  is_healed: boolean
  session_count: number
  total_sessions_needed: number
  progress_pct: number
  llm_params: LLMParams
}

interface SeverityHistoryEntry {
  ts: string
  total: number
  old_total: number
  reason: string
}

interface Props {
  patientId: string
  sessionId?: string
  mode: 'diagnostics' | 'psychotherapy'
  onStateChange?: (state: PatientState) => void
  onLLMParamsChange?: (params: LLMParams) => void
  readOnly?: boolean
}

// ─── Предустановки ────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Лёгкая',
    range: '20–30%',
    value: 25,
    color: C.success,
    bg: C.successLight,
    border: '#86efac',
    desc: 'Пациент функционирует. Симптомы умеренные, способен к рефлексии.',
    metrics: { intensity: 25, reactivity: 20, cognitive_distortions: 25, social_isolation: 15, suicidal_ideation: 0 },
  },
  {
    label: 'Умеренная',
    range: '40–60%',
    value: 50,
    color: C.blue,
    bg: '#eff6ff',
    border: '#93c5fd',
    desc: 'Симптомы заметны. Мешают повседневной жизни, но пациент справляется.',
    metrics: { intensity: 55, reactivity: 50, cognitive_distortions: 55, social_isolation: 45, suicidal_ideation: 0 },
  },
  {
    label: 'Тяжёлая',
    range: '70–85%',
    value: 75,
    color: C.warning,
    bg: C.warningLight,
    border: '#fde68a',
    desc: 'Симптомы сильно нарушают функционирование. Пациент в выраженном дистрессе.',
    metrics: { intensity: 80, reactivity: 75, cognitive_distortions: 85, social_isolation: 70, suicidal_ideation: 15 },
  },
  {
    label: 'Критическая',
    range: '90%+',
    value: 90,
    color: C.danger,
    bg: C.dangerLight,
    border: '#fca5a5',
    desc: '⚠️ ОСТРОЕ СОСТОЯНИЕ. Симптомы максимальны. Повышен суицидальный риск.',
    metrics: { intensity: 95, reactivity: 90, cognitive_distortions: 95, social_isolation: 90, suicidal_ideation: 60 },
  },
]

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  resistance: { label: 'Сопротивление', color: C.danger, bg: C.dangerLight, border: '#fca5a5', icon: '🛡', desc: 'Пациент защищается, уклоняется. Доверие низкое.' },
  exploration: { label: 'Исследование', color: C.blue, bg: '#eff6ff', border: '#93c5fd', icon: '🔍', desc: 'Пациент начинает открываться. Готов обсуждать проблемы.' },
  insight: { label: 'Инсайт', color: C.warning, bg: C.warningLight, border: '#fde68a', icon: '💡', desc: 'Появляется понимание паттернов и связей.' },
  integration: { label: 'Интеграция', color: C.success, bg: C.successLight, border: '#86efac', icon: '🌱', desc: 'Устойчивое улучшение. Пациент применяет инсайты.' },
}

// ─── Хук для API ──────────────────────────────────────────────
function usePatientState(patientId: string, onStateChange?: (s: PatientState) => void, onLLMChange?: (p: LLMParams) => void) {
  const [state, setState] = useState<PatientState | null>(null)
  const [history, setHistory] = useState<SeverityHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = localStorage.getItem('psytrainer_token')

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setState(data)
        onStateChange?.(data)
        onLLMChange?.(data.llm_params)
      }
    } catch { /* используем мок */ }
  }, [patientId, token])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/severity/history?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch {}
  }, [patientId, token])

  const updateSeverity = useCallback(async (metrics: SeverityMetrics, reason?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/patients/${patientId}/severity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ severity: metrics, reason }),
      })
      if (res.ok) {
        await fetchState()
        await fetchHistory()
      } else {
        // Мок-обновление без API
        mockUpdateState(metrics)
      }
    } catch {
      mockUpdateState(metrics)
    } finally {
      setLoading(false)
    }
  }, [patientId, token, fetchState, fetchHistory])

  // Мок когда API недоступен
  const mockUpdateState = (metrics: SeverityMetrics) => {
    const llmParams = getSeverityLLMParams(metrics.total)
    const mockState: PatientState = {
      severity: metrics,
      dynamic: state?.dynamic || { openness: 20, trust: 15, distress: 85, symptom_level: metrics.total, motivation: 30 },
      stage: state?.stage || 'resistance',
      stage_label: state?.stage_label || 'Сопротивление',
      is_healed: false,
      session_count: state?.session_count || 0,
      total_sessions_needed: state?.total_sessions_needed || 10,
      progress_pct: state?.progress_pct || 0,
      llm_params: llmParams,
    }
    setState(mockState)
    onStateChange?.(mockState)
    onLLMChange?.(llmParams)
    setHistory(prev => [{
      ts: new Date().toISOString(),
      total: metrics.total,
      old_total: state?.severity.total || 50,
      reason: 'manual',
    }, ...prev].slice(0, 20))
  }

  useEffect(() => {
    fetchState()
    fetchHistory()
  }, [patientId])

  return { state, history, loading, error, updateSeverity, fetchState }
}

function getSeverityLLMParams(total: number): LLMParams {
  if (total <= 30) return { temperature: 0.6, top_p: 0.85, max_tokens: 200, style: 'calm_reflective', description: 'Симптомы слабо выражены. Пациент способен к рефлексии.' }
  if (total <= 60) return { temperature: 0.7, top_p: 0.90, max_tokens: 150, style: 'anxious_paused', description: 'Симптомы умеренные. Пациент тревожен, иногда сбивается.' }
  if (total <= 85) return { temperature: 0.8, top_p: 0.95, max_tokens: 100, style: 'distressed_short', description: 'Симптомы сильно выражены. Ответы короткие и эмоциональные.' }
  return { temperature: 0.9, top_p: 0.98, max_tokens: 60, style: 'critical_fragmented', description: 'КРИТИЧЕСКОЕ СОСТОЯНИЕ. Ответы фрагментированные.' }
}

// ─── Слайдер ──────────────────────────────────────────────────
function SeveritySlider({ value, onChange, min = 0, max = 95, disabled = false, color }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; disabled?: boolean; color?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100
  const sliderColor = color || (value <= 30 ? C.success : value <= 60 ? C.blue : value <= 85 ? C.warning : C.danger)

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(Math.round(min + ratio * (max - min)))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + 1))
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, value - 1))
  }

  return (
    <div ref={trackRef} onClick={handleClick} onKeyDown={handleKey} tabIndex={0} style={{
      height: 10, borderRadius: 5, background: '#e5e7eb', cursor: disabled ? 'default' : 'pointer',
      position: 'relative', userSelect: 'none', outline: 'none',
    }}>
      {/* Заполнение */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, borderRadius: 5, background: `linear-gradient(90deg, ${C.success}, ${value > 60 ? C.warning : C.success}, ${value > 80 ? C.danger : C.warning})`, transition: 'width 0.2s' }} />
      {/* Большой круг ручки */}
      <div style={{
        position: 'absolute', top: '50%', left: `${pct}%`,
        transform: 'translate(-50%, -50%)',
        width: 22, height: 22, borderRadius: '50%',
        background: sliderColor, border: '3px solid white',
        boxShadow: `0 2px 8px ${sliderColor}66`,
        cursor: disabled ? 'default' : 'grab',
        transition: 'left 0.1s, background 0.2s',
        zIndex: 2,
      }} />
      {/* Зональные метки */}
      {[25, 50, 75].map(mark => (
        <div key={mark} style={{ position: 'absolute', top: '130%', left: `${mark}%`, transform: 'translateX(-50%)', width: 1, height: 4, background: '#d1d5db' }} />
      ))}
    </div>
  )
}

// ─── Полоска метрики ──────────────────────────────────────────
function MetricBar({ label, value, onChange, icon, disabled }: {
  label: string; value: number; onChange?: (v: number) => void
  icon: string; disabled?: boolean
}) {
  const color = value <= 30 ? C.success : value <= 60 ? C.blue : value <= 80 ? C.warning : C.danger
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: C.textSecondary }}>
          <span>{icon}</span>
          <span>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{value}%</span>
      </div>
      {onChange ? (
        <SeveritySlider value={value} onChange={onChange} disabled={disabled} color={color} />
      ) : (
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  )
}

// ─── Динамическая метрика состояния ───────────────────────────
function StateMetric({ label, value, icon, positive = true }: {
  label: string; value: number; icon: string; positive?: boolean
}) {
  // positive: высокое значение хорошо (openness, trust, motivation)
  // !positive: высокое значение плохо (distress, symptom_level)
  const isGood = positive ? value >= 60 : value <= 40
  const isBad  = positive ? value <= 30 : value >= 70
  const color = isBad ? C.danger : isGood ? C.success : C.warning
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 14, width: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(value)}</span>
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Предупреждение ───────────────────────────────────────────
function Warning({ type, msg }: { type: 'danger' | 'warning'; msg: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, marginBottom: 12, background: type === 'danger' ? C.dangerLight : C.warningLight, border: `1px solid ${type === 'danger' ? '#fca5a5' : '#fde68a'}`, fontSize: 12, color: type === 'danger' ? '#7f1d1d' : '#78350f', lineHeight: 1.5 }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{type === 'danger' ? '🚨' : '⚠️'}</span>
      <span>{msg}</span>
    </div>
  )
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────
export default function SeverityControl({
  patientId, sessionId, mode, onStateChange, onLLMParamsChange, readOnly = false,
}: Props) {
  const { state, history, loading, updateSeverity } = usePatientState(patientId, onStateChange, onLLMParamsChange)

  const [localMetrics, setLocalMetrics] = useState<SeverityMetrics>({
    total: 50, intensity: 50, reactivity: 50, cognitive_distortions: 50, social_isolation: 50, suicidal_ideation: 0,
  })
  const [activeTab, setActiveTab] = useState<'severity' | 'dynamic' | 'history'>('severity')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [pendingApply, setPendingApply] = useState(false)
  const [showSuicidalWarning, setShowSuicidalWarning] = useState(false)
  const [appliedFeedback, setAppliedFeedback] = useState(false)
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state) setLocalMetrics(state.severity)
  }, [state])

  // Дебаунс: применяем через 600мс после последнего изменения
  const scheduleApply = (metrics: SeverityMetrics) => {
    setPendingApply(true)
    if (applyTimer.current) clearTimeout(applyTimer.current)
    applyTimer.current = setTimeout(async () => {
      await updateSeverity(metrics)
      setPendingApply(false)
      setAppliedFeedback(true)
      setTimeout(() => setAppliedFeedback(false), 1500)
    }, 600)
  }

  const handleTotalChange = (val: number) => {
    if (readOnly) return
    const newMetrics = { ...localMetrics, total: val }
    // Пропорционально корректируем остальные метрики
    const factor = val / Math.max(1, localMetrics.total)
    newMetrics.intensity = Math.min(100, Math.round(localMetrics.intensity * factor))
    newMetrics.reactivity = Math.min(100, Math.round(localMetrics.reactivity * factor))
    newMetrics.cognitive_distortions = Math.min(100, Math.round(localMetrics.cognitive_distortions * factor))
    newMetrics.social_isolation = Math.min(100, Math.round(localMetrics.social_isolation * factor))
    setLocalMetrics(newMetrics)
    setSelectedPreset(null)
    scheduleApply(newMetrics)
  }

  const handleMetricChange = (key: keyof SeverityMetrics, val: number) => {
    if (readOnly) return
    if (key === 'suicidal_ideation' && val > 50) setShowSuicidalWarning(true)
    const newMetrics = { ...localMetrics, [key]: val }
    // Пересчитываем total как среднее
    const vals = [newMetrics.intensity, newMetrics.reactivity, newMetrics.cognitive_distortions, newMetrics.social_isolation]
    newMetrics.total = Math.min(95, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))
    setLocalMetrics(newMetrics)
    setSelectedPreset(null)
    scheduleApply(newMetrics)
  }

  const applyPreset = (preset: typeof PRESETS[0], idx: number) => {
    if (readOnly) return
    if (idx === 3) setShowSuicidalWarning(true)
    const newMetrics: SeverityMetrics = {
      total: preset.value,
      ...preset.metrics,
    }
    setLocalMetrics(newMetrics)
    setSelectedPreset(idx)
    scheduleApply(newMetrics)
  }

  const totalColor = localMetrics.total <= 30 ? C.success : localMetrics.total <= 60 ? C.blue : localMetrics.total <= 85 ? C.warning : C.danger
  const llmParams = getSeverityLLMParams(localMetrics.total)
  const stageConfig = STAGE_CONFIG[state?.stage || 'resistance']

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, color: C.textPrimary }}>

      {/* ── ЗАГОЛОВОК ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          🧠 Состояние пациента
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {pendingApply && <span style={{ fontSize: 11, color: C.textMuted }}>…</span>}
          {appliedFeedback && <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Применено</span>}
        </div>
      </div>

      {/* ── СТАДИЯ (только психотерапия) ── */}
      {mode === 'psychotherapy' && state && (
        <div style={{ background: stageConfig.bg, border: `1px solid ${stageConfig.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{stageConfig.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: stageConfig.color }}>Стадия: {stageConfig.label}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.4 }}>{stageConfig.desc}</div>
          {state.total_sessions_needed > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: C.textMuted }}>
                <span>Прогресс курса</span>
                <span>{state.session_count} / ~{state.total_sessions_needed} сессий</span>
              </div>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${state.progress_pct}%`, background: stageConfig.color, borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ИЗЛЕЧЕНИЕ ── */}
      {state?.is_healed && (
        <div style={{ background: C.successLight, border: '2px solid #86efac', borderRadius: 10, padding: '12px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🌱</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.success }}>Устойчивое улучшение!</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Пациент достиг стадии интеграции</div>
        </div>
      )}

      {/* ── ПРЕДУПРЕЖДЕНИЯ ── */}
      {localMetrics.total > 80 && !showSuicidalWarning && (
        <Warning type="warning" msg="Высокая выраженность. Пациент в дистрессе — ответы будут короткими и эмоциональными." />
      )}
      {(showSuicidalWarning || localMetrics.suicidal_ideation > 50) && (
        <Warning type="danger" msg="⚠️ Высокий уровень суицидальных мыслей. В реальной практике это требует немедленного вмешательства." />
      )}

      {/* ── ТАБЫ ── */}
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 14 }}>
        {[
          { id: 'severity', label: '⚙️ Контроль' },
          { id: 'dynamic', label: '📊 Динамика' },
          { id: 'history', label: '🕐 История' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, borderRadius: 6, transition: 'all 0.15s',
            background: activeTab === t.id ? C.surface : 'transparent',
            color: activeTab === t.id ? C.textPrimary : C.textMuted,
            boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: КОНТРОЛЬ ══ */}
      {activeTab === 'severity' && (
        <div>
          {/* ГЛАВНЫЙ СЛАЙДЕР */}
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>Выраженность симптомов</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: totalColor, lineHeight: 1 }}>{localMetrics.total}</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>%</span>
              </div>
            </div>

            <SeveritySlider value={localMetrics.total} onChange={handleTotalChange} disabled={readOnly} color={totalColor} />

            {/* Зональные метки */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: C.textMuted }}>
              <span style={{ color: C.success }}>Лёгкая</span>
              <span style={{ color: C.blue }}>Умеренная</span>
              <span style={{ color: C.warning }}>Тяжёлая</span>
              <span style={{ color: C.danger }}>Критич.</span>
            </div>

            {/* Описание текущего уровня */}
            <div style={{ marginTop: 10, padding: '8px 10px', background: `${totalColor}15`, borderRadius: 7, fontSize: 11, color: C.textSecondary, lineHeight: 1.5, border: `1px solid ${totalColor}30` }}>
              {llmParams.description}
            </div>
          </div>

          {/* ПРЕДУСТАНОВКИ */}
          {!readOnly && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Быстрый выбор</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {PRESETS.map((preset, idx) => (
                  <button key={idx} onClick={() => applyPreset(preset, idx)} style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    border: `1.5px solid ${selectedPreset === idx ? preset.color : C.border}`,
                    background: selectedPreset === idx ? preset.bg : C.surface,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: selectedPreset === idx ? preset.color : C.textPrimary }}>{preset.label}</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>{preset.range}</div>
                  </button>
                ))}
              </div>
              {/* Описание выбранной предустановки */}
              {selectedPreset !== null && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: PRESETS[selectedPreset].bg, borderRadius: 7, fontSize: 11, color: C.textSecondary, lineHeight: 1.5, border: `1px solid ${PRESETS[selectedPreset].border}` }}>
                  {PRESETS[selectedPreset].desc}
                </div>
              )}
            </div>
          )}

          {/* ДЕТАЛЬНЫЕ МЕТРИКИ */}
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              📊 Детальные метрики
            </div>
            <MetricBar label="Интенсивность симптомов" value={localMetrics.intensity} icon="🔥" onChange={readOnly ? undefined : v => handleMetricChange('intensity', v)} disabled={readOnly} />
            <MetricBar label="Эмоциональная реактивность" value={localMetrics.reactivity} icon="⚡" onChange={readOnly ? undefined : v => handleMetricChange('reactivity', v)} disabled={readOnly} />
            <MetricBar label="Когнитивные искажения" value={localMetrics.cognitive_distortions} icon="🌀" onChange={readOnly ? undefined : v => handleMetricChange('cognitive_distortions', v)} disabled={readOnly} />
            <MetricBar label="Социальная изоляция" value={localMetrics.social_isolation} icon="🚪" onChange={readOnly ? undefined : v => handleMetricChange('social_isolation', v)} disabled={readOnly} />
            <MetricBar label="Суицидальные мысли" value={localMetrics.suicidal_ideation} icon="⚠️" onChange={readOnly ? undefined : v => handleMetricChange('suicidal_ideation', v)} disabled={readOnly} />
          </div>

          {/* LLM параметры */}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Параметры LLM</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                ['temp', llmParams.temperature.toFixed(1)],
                ['top_p', llmParams.top_p.toFixed(2)],
                ['tokens', String(llmParams.max_tokens)],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#0f172a', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#a3e635', fontFamily: 'monospace' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: ДИНАМИКА ══ */}
      {activeTab === 'dynamic' && (
        <div>
          {state ? (
            <>
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Текущее состояние</div>
                <StateMetric label="Открытость" value={state.dynamic.openness} icon="💚" positive />
                <StateMetric label="Доверие" value={state.dynamic.trust} icon="🤝" positive />
                <StateMetric label="Дистресс" value={state.dynamic.distress} icon="😰" positive={false} />
                <StateMetric label="Симптоматика" value={state.dynamic.symptom_level} icon="🎯" positive={false} />
                <StateMetric label="Мотивация" value={state.dynamic.motivation} icon="🚀" positive />
              </div>

              {/* Критерии излечения */}
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>🌱 Критерии улучшения</div>
                {[
                  { label: 'Дистресс < 20', ok: state.dynamic.distress < 20, val: `${Math.round(state.dynamic.distress)}/20` },
                  { label: 'Открытость > 80', ok: state.dynamic.openness > 80, val: `${Math.round(state.dynamic.openness)}/80` },
                  { label: 'Доверие > 75', ok: state.dynamic.trust > 75, val: `${Math.round(state.dynamic.trust)}/75` },
                  { label: 'Мотивация > 80', ok: state.dynamic.motivation > 80, val: `${Math.round(state.dynamic.motivation)}/80` },
                  { label: 'Симптомы < 20', ok: state.dynamic.symptom_level < 20, val: `${Math.round(state.dynamic.symptom_level)}/20` },
                ].map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.ok ? C.success : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.ok && <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: c.ok ? C.success : C.textSecondary, fontWeight: c.ok ? 600 : 400, flex: 1 }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{c.val}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13 }}>Загрузка состояния...</div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ИСТОРИЯ ══ */}
      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textMuted }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🕐</div>
              <div style={{ fontSize: 13 }}>История изменений пуста</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((entry, i) => {
                const delta = entry.total - entry.old_total
                const time = new Date(entry.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, fontSize: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${delta > 0 ? C.dangerLight : C.successLight}`, border: `1px solid ${delta > 0 ? '#fca5a5' : '#86efac'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: delta > 0 ? C.danger : C.success, flexShrink: 0 }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: C.textPrimary }}>{entry.old_total}% → {entry.total}%</div>
                      <div style={{ color: C.textMuted, fontSize: 11 }}>{entry.reason === 'manual' ? '✋ Вручную' : entry.reason} · {time}</div>
                    </div>
                    <div style={{ width: 36, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${entry.total}%`, background: entry.total <= 30 ? C.success : entry.total <= 60 ? C.blue : entry.total <= 85 ? C.warning : C.danger, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}