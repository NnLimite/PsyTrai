/**
 * PatientsPage.tsx — /patients
 * Три секции: мои пациенты | каталог платформы | недавние
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const C = {
  bg: '#f0fdf4', surface: '#ffffff', surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentMid: '#52b788', accentLight: '#d8f3dc', accentSoft: '#f0fdf4',
  border: '#e2e8f0', borderFocus: '#2d6a4f',
  danger: '#ef4444', dangerLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb',
  blue: '#3b82f6', blueLight: '#eff6ff',
  purple: '#7c3aed', purpleLight: '#f5f3ff',
  shadow: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
  radius: '12px', radiusLg: '18px', radiusXl: '24px',
}

type Severity = 'mild' | 'moderate' | 'severe'
type Language = 'ru' | 'en' | 'de'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  disorder: string
  severity: Severity
  lore: string
  language: Language
  isPublic: boolean
  createdByMe: boolean
  sessionsCount: number
  lastSessionAt?: string
  avatarColor?: string
}

const SEVERITY_CFG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  mild:     { label: 'Лёгкая',    color: C.accent,  bg: C.accentSoft,   border: C.accentLight },
  moderate: { label: 'Умеренная', color: C.warning,  bg: C.warningLight, border: '#fde68a' },
  severe:   { label: 'Тяжёлая',   color: C.danger,   bg: C.dangerLight,  border: '#fca5a5' },
}

const AVATAR_GRADIENTS = [
  `linear-gradient(135deg, #2d6a4f, #52b788)`,
  `linear-gradient(135deg, #7c3aed, #a78bfa)`,
  `linear-gradient(135deg, #d97706, #fbbf24)`,
  `linear-gradient(135deg, #1d4ed8, #60a5fa)`,
  `linear-gradient(135deg, #be185d, #f472b6)`,
  `linear-gradient(135deg, #065f46, #6ee7b7)`,
]

const MY_PATIENTS: Patient[] = [
  { id: 'my1', name: 'Константин', age: 45, gender: 'М', disorder: 'ПТСР', severity: 'severe', lore: 'Ветеран, боевые действия. Флэшбэки, гипербдительность, нарушения сна уже 3 года. Избегает любых напоминаний о службе.', language: 'ru', isPublic: false, createdByMe: true, sessionsCount: 4, lastSessionAt: '2026-08-25T09:00:00Z', avatarColor: AVATAR_GRADIENTS[3] },
  { id: 'my2', name: 'Ирина', age: 31, gender: 'Ж', disorder: 'Нарциссическое РЛ', severity: 'moderate', lore: 'Маркетолог, перфекционизм, грандиозность в фантазиях. Хрупкая самооценка под маской успешности. Сложности в близких отношениях.', language: 'ru', isPublic: false, createdByMe: true, sessionsCount: 2, lastSessionAt: '2026-08-20T14:00:00Z', avatarColor: AVATAR_GRADIENTS[4] },
  { id: 'my3', name: 'Viktor', age: 27, gender: 'М', disorder: 'Social Phobia', severity: 'moderate', lore: 'Software developer. Avoids meetings, remote-only. Panic before presentations. Childhood bullying.', language: 'en', isPublic: true, createdByMe: true, sessionsCount: 1, avatarColor: AVATAR_GRADIENTS[1] },
]

const PLATFORM_PATIENTS: Patient[] = [
  { id: 'p1', name: 'Алексей', age: 34, gender: 'М', disorder: 'ОКР', severity: 'moderate', lore: 'Программист. Проверяет замок 8 раз. Развод 2 года назад ухудшил симптомы. Строгий отец в детстве.', language: 'ru', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[0] },
  { id: 'p2', name: 'Мария', age: 28, gender: 'Ж', disorder: 'ГТР', severity: 'mild', lore: 'Студентка магистратуры. Хроническая тревога. Гиперответственность. Тревога нарастает к экзаменам.', language: 'ru', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[5] },
  { id: 'p3', name: 'Дмитрий', age: 41, gender: 'М', disorder: 'Депрессия', severity: 'moderate', lore: 'Руководитель. Ангедония после карьерного успеха. Бессонница 6 месяцев. Чувство пустоты.', language: 'ru', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[2] },
  { id: 'p4', name: 'Елена', age: 35, gender: 'Ж', disorder: 'ПТСР', severity: 'severe', lore: 'Бывший медработник. ЧС-ситуации. Флэшбэки, избегание медицинских учреждений. Нарушена доверие к миру.', language: 'ru', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[3] },
  { id: 'p5', name: 'Андрей', age: 22, gender: 'М', disorder: 'Биполярное РА', severity: 'moderate', lore: 'Студент. Маниакальные эпизоды с грандиозными планами, сменяемые депрессией. Семья в растерянности.', language: 'ru', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[1] },
  { id: 'p6', name: 'Sophie', age: 30, gender: 'Ж', disorder: 'Anorexia nervosa', severity: 'severe', lore: 'Ballerina. Extreme calorie restriction. BMI 16.2. Denial of the problem. Control is central theme.', language: 'en', isPublic: true, createdByMe: false, sessionsCount: 0, avatarColor: AVATAR_GRADIENTS[4] },
]

const RECENT_PATIENTS: Patient[] = [
  PLATFORM_PATIENTS[0],
  PLATFORM_PATIENTS[1],
  MY_PATIENTS[0],
]

function PatientAvatar({ name, gradient, size = 44 }: { name: string; gradient?: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: gradient || AVATAR_GRADIENTS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.38 }}>
      {name[0].toUpperCase()}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_CFG[severity]
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{c.label}</span>
}

function LangBadge({ lang }: { lang: Language }) {
  const flags: Record<Language, string> = { ru: '🇷🇺 RU', en: '🇬🇧 EN', de: '🇩🇪 DE' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.textMuted }}>{flags[lang]}</span>
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'info'; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: type === 'success' ? '#f0fdf4' : C.blueLight, border: `1px solid ${type === 'success' ? '#86efac' : '#93c5fd'}`, color: type === 'success' ? '#166534' : C.blue, padding: '12px 18px', borderRadius: C.radius, fontSize: 14, fontWeight: 500, boxShadow: C.shadowMd, display: 'flex', alignItems: 'center', gap: 10 }}>{msg}<span onClick={onClose} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.6 }}>✕</span></div>
}

// ─── Карточка пациента ────────────────────────────────────────
function PatientCard({ patient, showActions = true, compact = false, onStart, onEdit, onDelete }: {
  patient: Patient; showActions?: boolean; compact?: boolean
  onStart: () => void; onEdit?: () => void; onDelete?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const lorePreview = patient.lore.length > 90 ? patient.lore.slice(0, 90) + '…' : patient.lore

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: compact ? '14px 16px' : '18px 20px', transition: 'all 0.2s', boxShadow: C.shadow }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadowMd; (e.currentTarget as HTMLElement).style.borderColor = C.accentLight }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadow; (e.currentTarget as HTMLElement).style.borderColor = C.border }}>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <PatientAvatar name={patient.name} gradient={patient.avatarColor} size={compact ? 38 : 46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontWeight: 700, fontSize: compact ? 14 : 15, color: C.textPrimary }}>{patient.name}</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>{patient.age} лет · {patient.gender}</span>
            {patient.isPublic && <span style={{ fontSize: 11, background: C.accentSoft, border: `1px solid ${C.accentLight}`, color: C.accent, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>Публичный</span>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: compact ? 0 : 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{patient.disorder}</span>
            <SeverityBadge severity={patient.severity} />
            <LangBadge lang={patient.language} />
          </div>

          {!compact && (
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
              {expanded ? patient.lore : lorePreview}
              {patient.lore.length > 90 && (
                <button onClick={() => setExpanded(!expanded)} style={{ marginLeft: 4, fontSize: 12, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontWeight: 600 }}>
                  {expanded ? 'свернуть' : 'ещё'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Кол-во сессий */}
        {patient.sessionsCount > 0 && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{patient.sessionsCount}</div>
            <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.2 }}>сессий</div>
          </div>
        )}
      </div>

      {/* Кнопки */}
      {showActions && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onStart} style={{ flex: 1, padding: '8px 0', borderRadius: C.radius, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            Начать сессию
          </button>
          {onEdit && (
            <button onClick={onEdit} style={{ padding: '8px 14px', borderRadius: C.radius, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              ✏️ Изменить
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{ padding: '8px 12px', borderRadius: C.radius, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 13, cursor: 'pointer' }}>
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ГЛАВНАЯ СТРАНИЦА ─────────────────────────────────────────
export default function PatientsPage() {
  const navigate = useNavigate()
  const [myPatients, setMyPatients] = useState<Patient[]>(MY_PATIENTS)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => setToast({ msg, type })

  const filteredMine = myPatients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.disorder.toLowerCase().includes(q)
    const matchSev = severityFilter === 'all' || p.severity === severityFilter
    return matchSearch && matchSev
  })

  const filteredPlatform = PLATFORM_PATIENTS.filter(p => {
    const q = catalogSearch.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.disorder.toLowerCase().includes(q)
  })

  const startSession = (patient: Patient) => {
    navigate(`/simulator?patient=${patient.id}`)
  }

  const deletePatient = (id: string) => {
    setMyPatients(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
    showToast('Пациент удалён', 'success')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Модалка удаления */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '28px', maxWidth: 380, width: '90%', boxShadow: C.shadowMd }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Удалить пациента?</div>
            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>Это действие нельзя отменить. История сессий с этим пациентом сохранится.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deletePatient(deleteConfirm)} style={{ flex: 1, padding: '11px 0', borderRadius: C.radius, border: 'none', background: C.danger, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Удалить</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px 0', borderRadius: C.radius, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 20px' }}>

        {/* Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', margin: '0 0 4px', color: C.textPrimary }}>Пациенты</h1>
            <p style={{ color: C.textSecondary, fontSize: 15, margin: 0 }}>Ваши профили, каталог платформы и недавние</p>
          </div>
          <button onClick={() => navigate('/patients/new')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: C.radiusLg, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 16px rgba(45,106,79,0.3)` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Создать пациента
          </button>
        </div>

        {/* ── НЕДАВНИЕ ── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: C.accent }} />
            <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.textPrimary }}>Недавние</h2>
            <span style={{ fontSize: 12, color: C.textMuted, background: C.surfaceAlt, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 20 }}>{RECENT_PATIENTS.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {RECENT_PATIENTS.map(p => (
              <div key={p.id} onClick={() => startSession(p)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: 12, alignItems: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accentLight; (e.currentTarget as HTMLElement).style.background = C.accentSoft }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = C.surface }}>
                <PatientAvatar name={p.name} gradient={p.avatarColor} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{p.name}, {p.age}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{p.disorder} · {SEVERITY_CFG[p.severity].label}</div>
                  {p.lastSessionAt && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Последняя сессия: {new Date(p.lastSessionAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</div>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        </section>

        {/* ── МОИ ПАЦИЕНТЫ ── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: C.purple }} />
              <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.textPrimary }}>Мои пациенты</h2>
              <span style={{ fontSize: 12, color: C.textMuted, background: C.surfaceAlt, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 20 }}>{myPatients.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
                  style={{ padding: '8px 12px 8px 30px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', color: C.textPrimary, background: C.surface, outline: 'none', width: 180 }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
                />
              </div>
              {(['all', 'mild', 'moderate', 'severe'] as const).map(s => (
                <button key={s} onClick={() => setSeverityFilter(s)} style={{ padding: '8px 12px', borderRadius: C.radius, border: `1px solid ${severityFilter === s ? C.accent : C.border}`, background: severityFilter === s ? C.accentSoft : C.surface, color: severityFilter === s ? C.accent : C.textSecondary, fontWeight: severityFilter === s ? 700 : 500, fontSize: 12, cursor: 'pointer' }}>
                  {s === 'all' ? 'Все' : SEVERITY_CFG[s].label}
                </button>
              ))}
            </div>
          </div>

          {filteredMine.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', background: C.surface, borderRadius: C.radiusLg, border: `2px dashed ${C.border}` }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🧩</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.textPrimary, marginBottom: 6 }}>{myPatients.length === 0 ? 'Создайте первого пациента' : 'Ничего не найдено'}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Конструктор позволяет задать лор, триггеры, стиль речи и расстройство</div>
              <button onClick={() => navigate('/patients/new')} style={{ padding: '10px 22px', borderRadius: C.radiusLg, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                + Создать пациента
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
              {filteredMine.map(p => (
                <PatientCard key={p.id} patient={p}
                  onStart={() => startSession(p)}
                  onEdit={() => navigate(`/patients/${p.id}/edit`)}
                  onDelete={() => setDeleteConfirm(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── КАТАЛОГ ПЛАТФОРМЫ ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: C.blue }} />
              <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.textPrimary }}>Каталог платформы</h2>
              <span style={{ fontSize: 12, color: C.textMuted, background: C.surfaceAlt, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 20 }}>{PLATFORM_PATIENTS.length}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="Поиск по каталогу..."
                style={{ padding: '8px 12px 8px 30px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', color: C.textPrimary, background: C.surface, outline: 'none', width: 200 }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = C.borderFocus}
                onBlur={e => (e.target as HTMLElement).style.borderColor = C.border}
              />
            </div>
          </div>

          <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.accent, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 15 }}>ℹ️</span>
            Базовые пациенты созданы клиническими психологами и верифицированы по критериям DSM-5 / МКБ-11
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
            {filteredPlatform.map(p => (
              <PatientCard key={p.id} patient={p}
                onStart={() => startSession(p)}
              />
            ))}
          </div>

          {filteredPlatform.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14 }}>По запросу «{catalogSearch}» ничего не найдено</div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}