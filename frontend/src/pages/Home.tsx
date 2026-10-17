import React from 'react'
import { useNavigate } from 'react-router-dom'

// Локальные стили (если нет компонентов)
const C = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2d6a4f',
  accentHover: '#1b4332',
  accentLight: '#d8f3dc',
  accentSoft: '#f0fdf4',
  border: '#e2e8f0',
  radius: '12px',
  radiusLg: '20px',
  radiusXl: '28px',
  shadowSm: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 16px rgba(15,23,42,0.08)',
  shadowLg: '0 20px 40px rgba(15,23,42,0.08)',
}

// Простые компоненты (если нет в UI)
function Btn({ children, onClick, variant = 'primary', size = 'md', fullWidth = false }: any) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: size === 'lg' ? '14px 32px' : '12px 24px',
    fontSize: size === 'lg' ? 16 : 15,
    fontWeight: 600,
    borderRadius: C.radius,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    width: fullWidth ? '100%' : 'auto',
  }
  
  const variants: any = {
    primary: { background: C.accent, color: '#fff' },
    outline: { background: 'transparent', color: C.accent, border: `1.5px solid ${C.accent}` },
  }
  
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

function Logo({ size = 20 }: { size?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <span style={{
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) * 0.28,
        background: `linear-gradient(135deg, ${C.accent}, #52b788)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
          <path d="M10 2C6.13 2 3 5.13 3 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 10c-1.75 0-3.29-.9-4.2-2.26.02-1.39 2.8-2.16 4.2-2.16 1.4 0 4.18.77 4.2 2.16C13.29 14.1 11.75 15 10 15z" fill="white" />
        </svg>
      </span>
      <span style={{ fontSize: size, fontWeight: 800, color: C.textPrimary }}>
        Psy<span style={{ color: C.accent }}>Trainer</span>
      </span>
    </span>
  )
}

function getUser() {
  try {
    const data = localStorage.getItem('psytrainer_user')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function Home() {
  const navigate = useNavigate()
  const user = getUser()

  const features = [
    { icon: '🧠', title: '30+ нозологий DSM-5 / МКБ-11', desc: 'Каталог расстройств от тревожных до личностных.' },
    { icon: '🎭', title: 'Конструктор пациента', desc: 'Задайте лор, анамнез, триггеры — модель сформирует уникальную роль.' },
    { icon: '📊', title: 'Анализ каждой сессии', desc: 'Оценка вопросов, эмпатии, этики и красные флаги.' },
    { icon: '🔀', title: 'Два режима работы', desc: 'Диагностика (статичный профиль) или Психотерапия (пациент меняется).' },
    { icon: '🌍', title: 'Русский, English, Deutsch', desc: 'Симуляция и интерфейс на трёх языках.' },
    { icon: '📄', title: 'PDF-отчёт', desc: 'Скачайте полный отчёт с транскриптом и оценками.' },
  ]

  return (
    <div>
      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #f0fdf4 100%)`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 72px', display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, margin: '0 0 20px', color: C.textPrimary }}>
              Тренируйте навыки<br /><span style={{ color: C.accent }}>психологического</span><br />консультирования
            </h1>
            <p style={{ color: C.textSecondary, fontSize: 17, margin: '0 0 36px', maxWidth: 520 }}>
              PsyTrainer — AI-тренажёр, где вы ведёте сессии с виртуальными пациентами без риска навредить реальному клиенту.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Btn size="lg" onClick={() => navigate(user ? '/simulator' : '/auth')}>
                Попробовать бесплатно →
              </Btn>
              <Btn variant="outline" size="lg" onClick={() => navigate('/patient/new')}>
                ➕ Новый пациент
              </Btn>
              <Btn variant="outline" size="lg" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                Тарифы
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '24px 26px' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '40px 24px', textAlign: 'center' }}>
        <Logo size={20} />
        <p style={{ marginTop: 12, color: C.textMuted }}>© {new Date().getFullYear()} PsyTrainer. Все права защищены.</p>
      </footer>
    </div>
  )
}