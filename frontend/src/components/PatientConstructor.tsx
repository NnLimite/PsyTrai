/**
 * PatientConstructor.tsx
 * Конструктор пациента — создание / редактирование профиля.
 * Соответствует ТЗ: лор, диагноз, анамнез, триггеры, защитные механизмы,
 * тип привязанности, мотивация, стиль речи, язык.
 */
import React, { useState, useEffect } from 'react'

// ─── Цвета ────────────────────────────────────────────────────
const C = {
  bg: '#f1f5f9', surface: '#ffffff', surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentLight: '#d8f3dc', accentSoft: '#f0fdf4',
  border: '#e2e8f0', borderFocus: '#2d6a4f',
  danger: '#ef4444', success: '#22c55e',
  shadowSm: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 16px rgba(15,23,42,0.08)',
  radius: '12px', radiusLg: '18px',
}

// ─── Данные для дропдаунов ──────────────────────────────────
const DISORDERS = [
  { value: '', label: '— Не указано —' },
  { value: 'okr', label: 'ОКР (Обсессивно-компульсивное расстройство)' },
  { value: 'schizo', label: 'Шизофрения' },
  { value: 'gad', label: 'Генерализованное тревожное расстройство' },
  { value: 'panic', label: 'Паническое расстройство' },
  { value: 'mdd', label: 'Большое депрессивное расстройство' },
  { value: 'bpd', label: 'Пограничное расстройство личности' },
  { value: 'ptsd', label: 'ПТСР' },
  { value: 'bipolar', label: 'Биполярное расстройство' },
  { value: 'anorexia', label: 'Нервная анорексия' },
  { value: 'bulimia', label: 'Нервная булимия' },
  { value: 'social_phobia', label: 'Социальная фобия' },
  { value: 'narcissistic', label: 'Нарциссическое расстройство личности' },
  { value: 'adhd', label: 'СДВГ (взрослые)' },
  { value: 'autism', label: 'Расстройство аутистического спектра' },
]

const SEVERITY = [
  { value: 'mild', label: '🟡 Лёгкая' },
  { value: 'moderate', label: '🟠 Умеренная' },
  { value: 'severe', label: '🔴 Тяжёлая' },
]

const ATTACHMENT_STYLES = [
  { value: '', label: '— Не указано —' },
  { value: 'secure', label: 'Надёжный (Secure)' },
  { value: 'anxious', label: 'Тревожный (Anxious)' },
  { value: 'avoidant', label: 'Избегающий (Avoidant)' },
  { value: 'disorganized', label: 'Дезорганизованный (Disorganized)' },
]

const MOTIVATIONS = [
  { value: '', label: '— Не указано —' },
  { value: 'high', label: '✅ Высокая — хочет изменений' },
  { value: 'ambivalent', label: '⚖️ Амбивалентная — сомневается' },
  { value: 'low', label: '❌ Низкая — пришёл под давлением' },
  { value: 'external', label: '🔗 Внешняя — настояли близкие / суд' },
]

const LANGUAGES = [
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
]

const TRIGGER_OPTIONS = [
  'Отношения', 'Работа', 'Деньги', 'Семья', 'Детство', 'Смерть близких',
  'Предательство', 'Одиночество', 'Тело / внешность', 'Секс', 'Насилие',
  'Болезнь', 'Контроль / хаос', 'Неудача / провал', 'Публичность',
]

const DEFENSE_OPTIONS = [
  'Вытеснение', 'Проекция', 'Рационализация', 'Отрицание',
  'Сублимация', 'Регрессия', 'Изоляция аффекта', 'Расщепление',
  'Диссоциация', 'Интроекция', 'Смещение', 'Реактивное образование',
]

// ─── Мини-компоненты ─────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.accent, marginBottom: 16, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: C.accentLight }} />
      {children}
      <div style={{ flex: 1, height: 1, background: C.accentLight }} />
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7, color: C.textSecondary }}>
      {children}{required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, error, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string; rows?: number
}) {
  const [focused, setFocused] = useState(false)
  const base = {
    width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
    border: `1.5px solid ${error ? C.danger : focused ? C.borderFocus : C.border}`,
    borderRadius: C.radius, background: C.surfaceAlt, color: C.textPrimary,
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
    resize: rows ? 'vertical' as const : 'none' as const,
  }
  return (
    <div style={{ marginBottom: error ? 4 : 0 }}>
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={rows} style={base} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={base} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: C.danger }}>{error}</p>}
    </div>
  )
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [focused, setFocused] = useState(false)
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
        border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
        borderRadius: C.radius, background: C.surfaceAlt, color: C.textPrimary,
        outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 36,
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function TagPicker({ options, selected, onChange, placeholder }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item])
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(o => {
          const on = selected.includes(o)
          return (
            <span key={o} onClick={() => toggle(o)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
              border: `1.5px solid ${on ? C.accent : C.border}`,
              background: on ? C.accentSoft : C.surfaceAlt,
              color: on ? C.accent : C.textSecondary,
            }}>
              {on && '✓ '}{o}
            </span>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: C.textMuted }}>
          Выбрано: {selected.length}
        </p>
      )}
    </div>
  )
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map(o => (
        <div key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '9px 16px', borderRadius: C.radius, cursor: 'pointer',
          border: `1.5px solid ${value === o.value ? C.accent : C.border}`,
          background: value === o.value ? C.accentSoft : C.surfaceAlt,
          fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          color: value === o.value ? C.accent : C.textSecondary,
        }}>{o.label}</div>
      ))}
    </div>
  )
}

// ─── Главный компонент ───────────────────────────────────────
interface PatientData {
  name: string; age: string; gender: string
  disorder: string; severity: string
  lore: string
  attachmentStyle: string; motivation: string
  triggerTopics: string[]; defenseMechanisms: string[]
  speechStyle: string; language: string
  isPublic: boolean
}

interface PatientConstructorProps {
  initial?: Partial<PatientData>
  onSave: (data: PatientData) => Promise<void>
  onCancel?: () => void
  title?: string
}

export default function PatientConstructor({ initial, onSave, onCancel, title = 'Конструктор пациента' }: PatientConstructorProps) {
  const [data, setData] = useState<PatientData>({
    name: '', age: '', gender: 'Не указан',
    disorder: '', severity: 'moderate',
    lore: '',
    attachmentStyle: '', motivation: '',
    triggerTopics: [], defenseMechanisms: [],
    speechStyle: '', language: 'ru',
    isPublic: false,
    ...initial,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'lore' | 'behavior' | 'settings'>('basic')

  const upd = (field: keyof PatientData, val: any) => {
    setData(d => ({ ...d, [field]: val }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!data.name.trim()) errs.name = 'Введите имя пациента'
    if (!data.disorder) errs.disorder = 'Выберите расстройство'
    if (!data.lore.trim()) errs.lore = 'Лор / история пациента обязательны'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      setActiveTab('basic')
      return
    }
    setLoading(true)
    try {
      await onSave(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'basic', label: '👤 Основное' },
    { id: 'lore', label: '📖 Лор' },
    { id: 'behavior', label: '🧩 Поведение' },
    { id: 'settings', label: '⚙️ Настройки' },
  ] as const

  // Character count for lore
  const loreWords = data.lore.trim().split(/\s+/).filter(Boolean).length

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, boxShadow: C.shadowMd, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.accentSoft}, #fff)`, borderBottom: `1px solid ${C.accentLight}`, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: C.textPrimary }}>{title}</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Заполните профиль — языковая модель сформирует реалистичную роль
          </p>
        </div>
        {data.name && (
          <div style={{ background: C.surface, border: `1px solid ${C.accentLight}`, borderRadius: C.radiusLg, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, #52b788)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 auto 4px' }}>
              {data.name[0]?.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{data.name}</div>
            {data.age && <div style={{ fontSize: 11, color: C.textMuted }}>{data.age} лет</div>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '12px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            borderBottom: `2px solid ${activeTab === t.id ? C.accent : 'transparent'}`,
            background: 'transparent',
            color: activeTab === t.id ? C.accent : C.textSecondary,
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
        {/* Required fields indicator */}
        {(errors.name || errors.disorder || errors.lore) && (
          <div style={{ marginLeft: 'auto', padding: '12px 16px', fontSize: 12, color: C.danger, display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚠ Заполните обязательные поля
          </div>
        )}
      </div>

      <div style={{ padding: '28px' }}>

        {/* ── TAB: BASIC ── */}
        {activeTab === 'basic' && (
          <div>
            <SectionTitle>Личные данные</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <FieldLabel required>Имя пациента</FieldLabel>
                <TextInput value={data.name} onChange={v => upd('name', v)} placeholder="Алексей" error={errors.name} />
              </div>
              <div>
                <FieldLabel>Возраст</FieldLabel>
                <TextInput value={data.age} onChange={v => upd('age', v)} placeholder="34" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Пол</FieldLabel>
              <RadioGroup
                options={[{ value: 'Мужской', label: '♂ Мужской' }, { value: 'Женский', label: '♀ Женский' }, { value: 'Другой', label: '⊙ Другой' }, { value: 'Не указан', label: '— Не указан' }]}
                value={data.gender} onChange={v => upd('gender', v)} />
            </div>

            <SectionTitle>Клинический профиль</SectionTitle>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel required>Расстройство (DSM-5 / МКБ-11)</FieldLabel>
              <SelectInput value={data.disorder} onChange={v => upd('disorder', v)} options={DISORDERS} />
              {errors.disorder && <p style={{ margin: '4px 0 0', fontSize: 12, color: C.danger }}>{errors.disorder}</p>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Степень выраженности симптомов</FieldLabel>
              <RadioGroup options={SEVERITY} value={data.severity} onChange={v => upd('severity', v)} />
            </div>

            <div style={{ marginBottom: 4 }}>
              <FieldLabel>Язык симуляции</FieldLabel>
              <RadioGroup options={LANGUAGES} value={data.language} onChange={v => upd('language', v)} />
            </div>
          </div>
        )}

        {/* ── TAB: LORE ── */}
        {activeTab === 'lore' && (
          <div>
            <SectionTitle>История и бэкстори</SectionTitle>
            <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
              💡 <strong>Лор</strong> — это подробная история жизни пациента. Чем детальнее, тем реалистичнее будет поведение AI. Укажите: ключевые события, отношения с близкими, профессию, что привело его на консультацию.
            </div>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel required>Лор / история пациента</FieldLabel>
              <TextInput
                value={data.lore} onChange={v => upd('lore', v)} rows={10}
                placeholder="Алексей — 34-летний программист из Санкт-Петербурга. Живёт один после развода два года назад. Обратился по настоянию сестры: заметила, что он всё чаще опаздывает на работу из-за ритуалов. Детство: строгий отец, требовавший идеальной чистоты. Мать — тревожная, гиперопека. В 15 лет появились первые навязчивые действия — проверял, закрыта ли дверь. После развода симптомы усилились..." />
              {errors.lore && <p style={{ margin: '4px 0 0', fontSize: 12, color: C.danger }}>{errors.lore}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: loreWords >= 50 ? C.success : C.textMuted }}>
                  {loreWords} слов {loreWords < 50 ? '(рекомендуется минимум 50)' : '✓'}
                </span>
              </div>
            </div>

            <div>
              <FieldLabel>Стиль речи</FieldLabel>
              <TextInput
                value={data.speechStyle} onChange={v => upd('speechStyle', v)} rows={3}
                placeholder="Краткие ответы, часто уходит от темы. Говорит формально, избегает слова 'чувства'. Иногда резко прерывает ответ и начинает говорить о другом." />
            </div>
          </div>
        )}

        {/* ── TAB: BEHAVIOR ── */}
        {activeTab === 'behavior' && (
          <div>
            <SectionTitle>Психологические характеристики</SectionTitle>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Тип привязанности</FieldLabel>
              <SelectInput value={data.attachmentStyle} onChange={v => upd('attachmentStyle', v)} options={ATTACHMENT_STYLES} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Мотивация к терапии</FieldLabel>
              <SelectInput value={data.motivation} onChange={v => upd('motivation', v)} options={MOTIVATIONS} />
            </div>

            <SectionTitle>Триггерные темы</SectionTitle>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>
                При упоминании этих тем пациент проявит видимый дискомфорт или попытается уйти от разговора.
              </p>
              <TagPicker options={TRIGGER_OPTIONS} selected={data.triggerTopics} onChange={v => upd('triggerTopics', v)} />
            </div>

            <SectionTitle>Защитные механизмы</SectionTitle>
            <div>
              <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>
                AI-пациент будет использовать выбранные механизмы психологической защиты в ходе диалога.
              </p>
              <TagPicker options={DEFENSE_OPTIONS} selected={data.defenseMechanisms} onChange={v => upd('defenseMechanisms', v)} />
            </div>
          </div>
        )}

        {/* ── TAB: SETTINGS ── */}
        {activeTab === 'settings' && (
          <div>
            <SectionTitle>Доступность</SectionTitle>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Публичный пресет</div>
                  <div style={{ fontSize: 13, color: C.textSecondary }}>Другие студенты вашего вуза смогут использовать этого пациента</div>
                </div>
                <div onClick={() => upd('isPublic', !data.isPublic)} style={{
                  width: 44, height: 24, borderRadius: 12, transition: 'background 0.2s', cursor: 'pointer',
                  background: data.isPublic ? C.accent : C.border,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                    left: data.isPublic ? 22 : 2,
                  }} />
                </div>
              </div>
            </div>

            <SectionTitle>Предпросмотр промпта</SectionTitle>
            <div style={{ background: '#1e293b', borderRadius: C.radius, padding: '16px 18px', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', lineHeight: 1.7, maxHeight: 300, overflowY: 'auto' }}>
              <span style={{ color: '#38bdf8' }}>// Системный промпт для LLM</span><br />
              <span style={{ color: '#a3e635' }}>Имя:</span> {data.name || '—'}<br />
              <span style={{ color: '#a3e635' }}>Возраст:</span> {data.age || '—'}<br />
              <span style={{ color: '#a3e635' }}>Расстройство:</span> {DISORDERS.find(d => d.value === data.disorder)?.label || '—'}<br />
              <span style={{ color: '#a3e635' }}>Тяжесть:</span> {SEVERITY.find(s => s.value === data.severity)?.label || '—'}<br />
              <span style={{ color: '#a3e635' }}>Привязанность:</span> {ATTACHMENT_STYLES.find(a => a.value === data.attachmentStyle)?.label || '—'}<br />
              <span style={{ color: '#a3e635' }}>Мотивация:</span> {MOTIVATIONS.find(m => m.value === data.motivation)?.label || '—'}<br />
              <span style={{ color: '#a3e635' }}>Триггеры:</span> {data.triggerTopics.join(', ') || '—'}<br />
              <span style={{ color: '#a3e635' }}>Защиты:</span> {data.defenseMechanisms.join(', ') || '—'}<br />
              <span style={{ color: '#a3e635' }}>Язык:</span> {data.language}<br />
              <span style={{ color: '#a3e635' }}>Лор (фрагмент):</span> {data.lore.slice(0, 120) || '—'}{data.lore.length > 120 ? '...' : ''}
            </div>
          </div>
        )}

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {onCancel && (
            <button onClick={onCancel} style={{ padding: '11px 24px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: 'transparent', color: C.textSecondary, cursor: 'pointer' }}>
              Отмена
            </button>
          )}

          {/* Tab navigation */}
          {activeTab !== 'basic' && (
            <button onClick={() => { const idx = tabs.findIndex(t => t.id === activeTab); setActiveTab(tabs[Math.max(0, idx - 1)].id) }}
              style={{ padding: '11px 24px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: 'transparent', color: C.textSecondary, cursor: 'pointer' }}>
              ← Назад
            </button>
          )}
          {activeTab !== 'settings' ? (
            <button onClick={() => { const idx = tabs.findIndex(t => t.id === activeTab); setActiveTab(tabs[Math.min(tabs.length - 1, idx + 1)].id) }}
              style={{ padding: '11px 24px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: 'none', borderRadius: C.radius, background: C.accent, color: '#fff', cursor: 'pointer' }}>
              Далее →
            </button>
          ) : (
            <button onClick={handleSave} disabled={loading} style={{ padding: '11px 28px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: 'none', borderRadius: C.radius, background: saved ? '#22c55e' : C.accent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.3s' }}>
              {loading
                ? <><Spinner />Сохранение...</>
                : saved
                  ? '✓ Сохранено!'
                  : '💾 Сохранить пациента'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Спиннер (локальный) ─────────────────────────────────────
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Демо-страница конструктора ───────────────────────────────
export function PatientConstructorPage() {
  const handleSave = async (data: PatientData) => {
    const token = localStorage.getItem('psytrainer_token')
    if (!token) { alert('Войдите в систему'); return }
    const res = await fetch('/api/v1/patients/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: data.name,
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender,
        disorder_id: data.disorder || null,
        severity: data.severity,
        lore: data.lore,
        attachment_style: data.attachmentStyle,
        motivation: data.motivation,
        trigger_topics: data.triggerTopics,
        defense_mechanisms: data.defenseMechanisms,
        speech_style: data.speechStyle,
        language: data.language,
        is_public: data.isPublic,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка сохранения')
    }
    alert('Пациент создан!')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <PatientConstructor onSave={handleSave} />
    </div>
  )
}