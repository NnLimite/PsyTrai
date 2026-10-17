/**
 * BillingPage.tsx — /billing
 * Страница подписки: текущий план, использование, тарифы, оплата YooKassa
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Цвета ────────────────────────────────────────────────────
const C = {
  bg: '#f0fdf4', surface: '#ffffff', surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  accent: '#2d6a4f', accentMid: '#52b788', accentLight: '#d8f3dc', accentSoft: '#f0fdf4',
  border: '#e2e8f0', borderFocus: '#2d6a4f',
  danger: '#ef4444', dangerLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb',
  blue: '#3b82f6', blueLight: '#eff6ff',
  purple: '#7c3aed', purpleLight: '#f5f3ff',
  gold: '#d97706', goldLight: '#fef3c7',
  shadow: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
  shadowLg: '0 12px 40px rgba(15,23,42,0.12)',
  radius: '12px', radiusLg: '18px', radiusXl: '24px',
}

// ─── Типы ──────────────────────────────────────────────────────
type PlanCode = 'free' | 'pro' | 'university'
type BillingCycle = 'monthly' | 'yearly'

interface Plan {
  code: PlanCode
  name: string
  priceMonthly: number
  priceYearly: number
  description: string
  badge?: string
  badgeColor?: string
  features: { text: string; included: boolean; highlight?: boolean }[]
  cta: string
  accent: string
  accentLight: string
}

interface UsageStats {
  sessionsToday: number
  sessionsLimit: number | null  // null = безлимит
  sessionsTotal: number
  sessionsTotalTime: number     // минут
  avgScore: number
  patientsCreated: number
  pdfsExported: number
  streakDays: number
  nextReset: string             // ISO date
}

// ─── Данные ───────────────────────────────────────────────────
const PLANS: Plan[] = [
  {
    code: 'free',
    name: 'Студент',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Первое знакомство с платформой',
    features: [
      { text: '3 сессии в сутки', included: true },
      { text: 'Базовые пациенты из каталога', included: true },
      { text: 'Текстовый чат', included: true },
      { text: 'Отчёт после сессии', included: true },
      { text: 'Конструктор пациентов', included: false },
      { text: 'Экспорт PDF', included: false },
      { text: 'Подсказки супервизора', included: false },
      { text: 'История и аналитика', included: false },
    ],
    cta: 'Ваш текущий план',
    accent: C.textSecondary,
    accentLight: C.surfaceAlt,
  },
  {
    code: 'pro',
    name: 'Профессионал',
    priceMonthly: 390,
    priceYearly: 3510,  // -25%
    description: 'Для серьёзной практики и роста',
    badge: '⭐ Популярный',
    badgeColor: C.accent,
    features: [
      { text: 'Безлимитные сессии', included: true, highlight: true },
      { text: 'Все 30+ нозологий DSM-5/МКБ-11', included: true, highlight: true },
      { text: 'Конструктор пациентов с лором', included: true, highlight: true },
      { text: 'PDF-отчёты с транскриптом', included: true, highlight: true },
      { text: 'Подсказки супервизора', included: true, highlight: true },
      { text: 'AI-разбор каждой реплики', included: true, highlight: true },
      { text: 'Режим психотерапии', included: true },
      { text: 'Приоритетная поддержка', included: true },
    ],
    cta: 'Перейти на Про',
    accent: C.accent,
    accentLight: C.accentSoft,
  },
  {
    code: 'university',
    name: 'Университет',
    priceMonthly: 0,
    priceYearly: 30000,  // от, за всех
    description: 'B2B-лицензия для кафедры или ВУЗа',
    badge: '🏛 Для ВУЗов',
    badgeColor: C.purple,
    features: [
      { text: 'Всё из тарифа Профессионал', included: true },
      { text: 'Неограниченное число студентов', included: true, highlight: true },
      { text: 'Кабинет преподавателя', included: true, highlight: true },
      { text: 'Роль супервизора', included: true, highlight: true },
      { text: 'Закрытые пресеты для группы', included: true },
      { text: 'Экспорт отчётов по группе', included: true },
      { text: 'Юридические документы', included: true },
      { text: 'Поддержка 24/7', included: true },
    ],
    cta: 'Связаться с нами',
    accent: C.purple,
    accentLight: C.purpleLight,
  },
]

// ─── Мок пользователя ─────────────────────────────────────────
const MOCK_USER_PLAN: PlanCode = 'free'

const MOCK_STATS: UsageStats = {
  sessionsToday: 2,
  sessionsLimit: 3,
  sessionsTotal: 7,
  sessionsTotalTime: 210,
  avgScore: 74,
  patientsCreated: 1,
  pdfsExported: 0,
  streakDays: 3,
  nextReset: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
}

// ─── Вспомогательные компоненты ───────────────────────────────
function Spinner({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color + '44'} strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  const cfg = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
    error:   { bg: C.dangerLight, border: '#fca5a5', color: C.danger },
    info:    { bg: C.blueLight,  border: '#93c5fd', color: C.blue },
  }[type]
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '13px 18px', borderRadius: C.radius, fontSize: 14, fontWeight: 500, boxShadow: C.shadowMd, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380 }}>
      {msg}
      <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.5, fontSize: 16 }}>✕</span>
    </div>
  )
}

function CheckIcon({ color = C.accent }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill={color + '20'} />
      <path d="M7 12l3.5 3.5L17 8.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#e5e7eb" />
      <path d="M9 9l6 6M15 9l-6 6" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ProgressBar({ value, max, color = C.accent }: { value: number; max: number; color?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 100
  const barColor = pct >= 90 ? C.danger : pct >= 70 ? C.warning : color
  return (
    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ─── Карточка плана ───────────────────────────────────────────
function PlanCard({
  plan, cycle, currentPlan, onSelect, loading,
}: {
  plan: Plan; cycle: BillingCycle; currentPlan: PlanCode
  onSelect: (plan: Plan) => void; loading: boolean
}) {
  const isCurrentPlan = plan.code === currentPlan
  const isCurrent = isCurrentPlan
  const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly * 12
  const displayPrice = plan.code === 'university' ? 'от 30 000 ₽' : plan.priceMonthly === 0 ? 'Бесплатно' : `${plan.priceMonthly} ₽`
  const perLabel = plan.priceMonthly === 0 || plan.code === 'university' ? '' : cycle === 'monthly' ? '/ месяц' : `/ год (${plan.priceYearly} ₽)`

  return (
    <div style={{
      background: C.surface, borderRadius: C.radiusXl, padding: '28px 24px',
      border: `${isCurrent ? 2 : 1.5}px solid ${isCurrent ? plan.accent : plan.code === 'pro' ? plan.accent + '60' : C.border}`,
      position: 'relative', display: 'flex', flexDirection: 'column',
      boxShadow: plan.code === 'pro' ? `0 8px 32px ${C.accent}22` : C.shadow,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { if (!isCurrent) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = C.shadowMd }}}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = plan.code === 'pro' ? `0 8px 32px ${C.accent}22` : C.shadow }}>

      {/* Бейдж */}
      {plan.badge && (
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.badgeColor, color: '#fff', padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${plan.badgeColor}44` }}>
          {plan.badge}
        </div>
      )}
      {isCurrent && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: plan.accent, color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          Текущий
        </div>
      )}

      <div style={{ flex: 1 }}>
        <h3 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 4px', color: C.textPrimary }}>{plan.name}</h3>
        <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.4 }}>{plan.description}</p>

        {/* Цена */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: isCurrent ? plan.accent : C.textPrimary, letterSpacing: '-0.03em' }}>{displayPrice}</span>
            {perLabel && <span style={{ fontSize: 13, color: C.textMuted }}>{perLabel}</span>}
          </div>
          {plan.code === 'pro' && cycle === 'yearly' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, color: C.accent }}>
              🎉 Скидка 25% при оплате за год
            </div>
          )}
        </div>

        {/* Фичи */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {f.included ? <CheckIcon color={plan.accent} /> : <XIcon />}
              <span style={{ fontSize: 13.5, color: f.included ? C.textPrimary : C.textMuted, fontWeight: f.highlight ? 600 : 400, textDecoration: !f.included ? 'line-through' : 'none', textDecorationColor: '#d1d5db' }}>
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка */}
      <button
        onClick={() => !isCurrent && onSelect(plan)}
        disabled={loading || isCurrent}
        style={{
          width: '100%', padding: '13px 0', borderRadius: C.radiusLg,
          border: isCurrent ? 'none' : plan.code === 'free' ? `1.5px solid ${C.border}` : 'none',
          background: isCurrent ? `${plan.accent}15` : plan.code === 'free' ? 'transparent' : plan.accent,
          color: isCurrent ? plan.accent : plan.code === 'free' ? C.textSecondary : '#fff',
          fontWeight: 700, fontSize: 15, cursor: isCurrent || loading ? 'default' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: !isCurrent && plan.code !== 'free' ? `0 4px 16px ${plan.accent}44` : 'none',
          opacity: isCurrent ? 0.7 : 1,
        }}>
        {loading ? <Spinner size={16} color={plan.code === 'free' ? C.textSecondary : '#fff'} /> : plan.cta}
      </button>
    </div>
  )
}

// ─── ГЛАВНАЯ СТРАНИЦА ─────────────────────────────────────────
export default function BillingPage() {
  const navigate = useNavigate()
  const [currentPlan] = useState<PlanCode>(MOCK_USER_PLAN)
  const [stats] = useState<UsageStats>(MOCK_STATS)
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [pulse, setPulse] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ msg, type })

  // Пульс на ограничение сессий
  useEffect(() => {
    if (stats.sessionsLimit && stats.sessionsToday >= stats.sessionsLimit - 1) {
      const t = setInterval(() => setPulse(v => !v), 1000)
      return () => clearInterval(t)
    }
  }, [stats])

  const handleSelectPlan = (plan: Plan) => {
    if (plan.code === 'university') {
      window.location.href = 'mailto:vadim231par@gmail.com?subject=Запрос лицензии PsyTrainer для ВУЗа'
      return
    }
    setSelectedPlan(plan)
    setShowPayModal(true)
  }

  const handlePay = async () => {
    if (!selectedPlan) return
    setLoading(true)
    try {
      const token = localStorage.getItem('psytrainer_token')
      const res = await fetch('/api/v1/payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: 'b2c_monthly', quantity: 1 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.confirmation_url) { window.location.href = data.confirmation_url; return }
      }
      // Мок для разработки
      showToast('Перенаправление на страницу оплаты ЮKassa...', 'info')
      setTimeout(() => {
        setShowPayModal(false)
        setLoading(false)
        showToast('Оплата успешна! Тариф «Профессионал» активирован 🎉', 'success')
      }, 2000)
    } catch {
      showToast('Ошибка при создании платежа', 'error')
      setLoading(false)
    }
  }

  const sessionsLeft = stats.sessionsLimit ? stats.sessionsLimit - stats.sessionsToday : null
  const hoursToReset = Math.ceil((new Date(stats.nextReset).getTime() - Date.now()) / 3600000)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Модалка оплаты */}
      {showPayModal && selectedPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '32px', maxWidth: 460, width: '100%', boxShadow: C.shadowLg }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 6px' }}>Оформить подписку</h2>
            <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              Тариф <strong>«{selectedPlan.name}»</strong> — <strong>{selectedPlan.priceMonthly} ₽/месяц</strong>
            </p>

            {/* Что входит */}
            <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 10 }}>Вы получите:</div>
              {selectedPlan.features.filter(f => f.included && f.highlight).map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, color: C.textSecondary }}>
                  <CheckIcon color={C.accent} />
                  {f.text}
                </div>
              ))}
            </div>

            {/* Цикл */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['monthly', 'yearly'] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{
                  flex: 1, padding: '10px 0', borderRadius: C.radius, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${cycle === c ? C.accent : C.border}`,
                  background: cycle === c ? C.accentSoft : 'transparent',
                  color: cycle === c ? C.accent : C.textSecondary,
                  fontWeight: cycle === c ? 700 : 500, fontSize: 13,
                }}>
                  {c === 'monthly' ? `Ежемесячно · ${selectedPlan.priceMonthly} ₽` : `Ежегодно · ${selectedPlan.priceYearly} ₽`}
                  {c === 'yearly' && <div style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>Скидка 25%</div>}
                </button>
              ))}
            </div>

            {/* Оплата */}
            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.textSecondary }}>К оплате</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary }}>
                  {cycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly} ₽
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                Оплата через ЮKassa · Visa, MasterCard, Мир, СБП
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handlePay} disabled={loading} style={{ flex: 2, padding: '13px 0', borderRadius: C.radiusLg, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 16px ${C.accent}44` }}>
                {loading ? <><Spinner size={16} /> Перенаправление...</> : '💳 Перейти к оплате'}
              </button>
              <button onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '13px 0', borderRadius: C.radiusLg, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Отмена
              </button>
            </div>
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
              Нажимая «Перейти к оплате» вы принимаете условия использования.<br />Отписаться можно в любой момент.
            </p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 20px' }}>

        {/* Заголовок */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', margin: '0 0 4px', color: C.textPrimary }}>Подписка и использование</h1>
          <p style={{ color: C.textSecondary, fontSize: 15, margin: 0 }}>Ваш текущий план и статистика</p>
        </div>

        {/* ── БЛОК ТЕКУЩЕГО СТАТУСА ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

          {/* Использование сессий */}
          <div style={{ background: C.surface, border: `${pulse && sessionsLeft === 1 ? '2px' : '1px'} solid ${sessionsLeft === 0 ? C.danger : sessionsLeft === 1 ? C.warning : C.border}`, borderRadius: C.radiusLg, padding: '22px 24px', boxShadow: sessionsLeft === 0 ? `0 0 0 3px ${C.dangerLight}` : C.shadow, transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Сессии сегодня</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: sessionsLeft === 0 ? C.danger : C.textPrimary }}>{stats.sessionsToday}</span>
                  {stats.sessionsLimit && <span style={{ fontSize: 18, color: C.textMuted }}>/ {stats.sessionsLimit}</span>}
                </div>
              </div>
              {sessionsLeft === 0 ? (
                <div style={{ background: C.dangerLight, border: '1px solid #fca5a5', borderRadius: C.radius, padding: '8px 12px', fontSize: 12, color: C.danger, fontWeight: 700, textAlign: 'center' }}>
                  🚫 Лимит исчерпан<br />
                  <span style={{ fontWeight: 400, fontSize: 11 }}>сброс через {hoursToReset}ч</span>
                </div>
              ) : sessionsLeft === 1 ? (
                <div style={{ background: C.warningLight, border: '1px solid #fde68a', borderRadius: C.radius, padding: '8px 12px', fontSize: 12, color: C.warning, fontWeight: 700, textAlign: 'center' }}>
                  ⚠️ Осталась<br /><span style={{ fontSize: 20, fontWeight: 900 }}>1</span> сессия
                </div>
              ) : (
                <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '8px 14px', fontSize: 13, color: C.accent, fontWeight: 600 }}>
                  ✅ Доступно: {sessionsLeft}
                </div>
              )}
            </div>
            {stats.sessionsLimit && <ProgressBar value={stats.sessionsToday} max={stats.sessionsLimit} />}
            {sessionsLeft !== null && sessionsLeft <= 1 && (
              <button onClick={() => setShowPayModal(true)} style={{ marginTop: 14, width: '100%', padding: '10px 0', borderRadius: C.radius, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                ⚡ Получить безлимит за 390 ₽/мес
              </button>
            )}
          </div>

          {/* Общая статистика */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '22px 24px', boxShadow: C.shadow }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Ваша статистика</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '📋', value: stats.sessionsTotal, label: 'Сессий всего' },
                { icon: '⏱', value: `${Math.floor(stats.sessionsTotalTime / 60)}ч ${stats.sessionsTotalTime % 60}м`, label: 'Время практики' },
                { icon: '⭐', value: `${stats.avgScore}/100`, label: 'Средний балл', color: stats.avgScore >= 75 ? C.accent : C.warning },
                { icon: '🔥', value: `${stats.streakDays} дн.`, label: 'Серия' },
              ].map(s => (
                <div key={s.label} style={{ background: C.bg, borderRadius: C.radius, padding: '10px 12px' }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: (s as any).color || C.textPrimary, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── БАННЕР АПГРЕЙДА (только для free) ── */}
        {currentPlan === 'free' && (
          <div style={{ background: `linear-gradient(135deg, ${C.accent}, #1b4332)`, borderRadius: C.radiusXl, padding: '28px 32px', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                ⭐ Профессионал
              </div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                Снимите ограничение в 3 сессии
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
                Безлимитные сессии · Конструктор пациентов · PDF-отчёты · Подсказки супервизора<br />
                Всё это за <strong style={{ color: '#fff' }}>390 ₽/месяц</strong> — меньше чашки кофе в день ☕
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['✅ Безлимит', '🧩 Конструктор', '📄 PDF', '💡 Подсказки', '🔍 AI-разбор'].map(f => (
                  <span key={f} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#fff' }}>{f}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setSelectedPlan(PLANS[1]); setShowPayModal(true) }} style={{ padding: '14px 32px', borderRadius: C.radiusLg, border: 'none', background: '#fff', color: C.accent, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                Попробовать за 390 ₽ →
              </button>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Отписаться в любой момент</div>
            </div>
          </div>
        )}

        {/* ── ПЕРЕКЛЮЧАТЕЛЬ ЦИКЛА ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{ fontSize: 14, color: C.textSecondary }}>Ежемесячно</span>
          <div onClick={() => setCycle(c => c === 'monthly' ? 'yearly' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 14, background: cycle === 'yearly' ? C.accent : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: cycle === 'yearly' ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 14, color: cycle === 'yearly' ? C.accent : C.textSecondary, fontWeight: cycle === 'yearly' ? 700 : 400 }}>
            Ежегодно
            <span style={{ marginLeft: 6, background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, color: C.accent }}>-25%</span>
          </span>
        </div>

        {/* ── КАРТОЧКИ ПЛАНОВ ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 48 }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.code} plan={plan} cycle={cycle} currentPlan={currentPlan} onSelect={handleSelectPlan} loading={loading} />
          ))}
        </div>

        {/* ── СРАВНИТЕЛЬНАЯ ТАБЛИЦА ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusXl, overflow: 'hidden', marginBottom: 36, boxShadow: C.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: C.accentSoft }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.textPrimary }}>Подробное сравнение</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, color: C.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}` }}>Функция</th>
                  {PLANS.map(p => (
                    <th key={p.code} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: p.code === currentPlan ? p.accent : C.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}`, background: p.code === currentPlan ? p.accentLight : undefined }}>
                      {p.name}
                      {p.code === currentPlan && <div style={{ fontSize: 10, fontWeight: 600, color: p.accent }}>↑ ВЫ</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Сессий в сутки', '3', 'Безлимит', 'Безлимит'],
                  ['Каталог расстройств', 'Базовые', '30+ нозологий', '30+ нозологий'],
                  ['Конструктор пациентов', '—', '✓', '✓'],
                  ['Экспорт PDF', '—', '✓', '✓'],
                  ['Подсказки супервизора', '—', '✓', '✓'],
                  ['AI-разбор реплик', '—', '✓', '✓'],
                  ['Кабинет преподавателя', '—', '—', '✓'],
                  ['Управление студентами', '—', '—', '✓'],
                  ['Поддержка', 'Email', 'Приоритет', '24/7'],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surfaceAlt }}>
                    <td style={{ padding: '12px 20px', fontWeight: 500, color: C.textPrimary }}>{row[0]}</td>
                    {row.slice(1).map((cell, j) => (
                      <td key={j} style={{ padding: '12px 16px', textAlign: 'center', color: cell === '—' ? C.textMuted : cell === '✓' ? C.accent : C.textPrimary, fontWeight: cell === '✓' ? 700 : 400, background: j === 0 && MOCK_USER_PLAN === 'free' ? `${C.accentSoft}44` : j === 1 && MOCK_USER_PLAN === 'pro' ? `${C.accentSoft}44` : undefined }}>
                        {cell === '✓' ? <CheckIcon color={PLANS[j].accent} /> : cell === '—' ? <span style={{ fontSize: 16, color: '#d1d5db' }}>—</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 36 }}>
          <h3 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 20px', letterSpacing: '-0.02em' }}>Частые вопросы</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { q: 'Можно ли отменить подписку?', a: 'Да, в любой момент в настройках профиля. Доступ сохраняется до конца оплаченного периода.' },
              { q: 'Что будет с моими данными после отмены?', a: 'История сессий сохраняется 365 дней согласно 152-ФЗ. Вы можете экспортировать всё в PDF до отмены.' },
              { q: 'Как оформить лицензию для ВУЗа?', a: 'Напишите на vadim231par@gmail.com с описанием задачи. Стоимость — от 30 000 ₽/год за неограниченное число студентов.' },
              { q: 'Какие способы оплаты поддерживаются?', a: 'Visa, MasterCard, Мир, СБП, электронные кошельки — через ЮKassa.' },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, lineHeight: 1.7, padding: '20px 0', borderTop: `1px solid ${C.border}` }}>
          Оплата обрабатывается через <strong>ЮKassa</strong> (ООО «ЮМани»).<br />
          Нажимая «Перейти к оплате» вы соглашаетесь с <a href="#" style={{ color: C.accent }}>условиями использования</a> и <a href="#" style={{ color: C.accent }}>политикой конфиденциальности</a>.<br />
          По вопросам: <a href="mailto:vadim231par@gmail.com" style={{ color: C.accent }}>vadim231par@gmail.com</a>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ аккордеон ───────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden', boxShadow: C.shadow }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: C.textPrimary, textAlign: 'left', gap: 12 }}>
        <span>{question}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 18px 14px', fontSize: 13, color: C.textSecondary, lineHeight: 1.65, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {answer}
        </div>
      )}
    </div>
  )
}