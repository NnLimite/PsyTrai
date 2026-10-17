import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const C = {
  bg: '#f0fdf4',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2d6a4f',
  accentHover: '#1b4332',
  accentLight: '#d8f3dc',
  accentSoft: '#f0fdf4',
  border: '#e2e8f0',
  borderFocus: '#2d6a4f',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  radius: '12px',
  radiusLg: '18px',
  shadowMd: '0 4px 20px rgba(15,23,42,0.08)',
}

// ─── СПРАВОЧНИК РАССТРОЙСТВ ───
const DISORDERS = [
  { id: 'f41.1', code: 'F41.1', name: 'Генерализованное тревожное расстройство' },
  { id: 'f32.0', code: 'F32.0', name: 'Депрессивный эпизод лёгкой степени' },
  { id: 'f32.1', code: 'F32.1', name: 'Депрессивный эпизод средней степени' },
  { id: 'f32.2', code: 'F32.2', name: 'Депрессивный эпизод тяжёлой степени' },
  { id: 'f42.0', code: 'F42.0', name: 'Обсессивно-компульсивное расстройство' },
  { id: 'f43.1', code: 'F43.1', name: 'Посттравматическое стрессовое расстройство' },
  { id: 'f40.1', code: 'F40.1', name: 'Социальное тревожное расстройство' },
  { id: 'f50.0', code: 'F50.0', name: 'Нервная анорексия' },
  { id: 'f50.2', code: 'F50.2', name: 'Нервная булимия' },
  { id: 'f60.3', code: 'F60.3', name: 'Эмоционально неустойчивое расстройство личности' },
  { id: 'f60.4', code: 'F60.4', name: 'Истерическое расстройство личности' },
  { id: 'f60.6', code: 'F60.6', name: 'Тревожное расстройство личности' },
  { id: 'f84.0', code: 'F84.0', name: 'Детский аутизм' },
  { id: 'f90.0', code: 'F90.0', name: 'Синдром дефицита внимания и гиперактивности' },
  { id: 'f95.0', code: 'F95.0', name: 'Тикозное расстройство' },
]

// ─── ВЫРАЖЕННОСТЬ ───
const SEVERITIES = [
  { id: 'mild', label: 'Лёгкая' },
  { id: 'moderate', label: 'Средняя' },
  { id: 'severe', label: 'Тяжёлая' },
]

export default function CreatePatient() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'diagnostics'

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Мужской',
    severity: 'moderate',
    selectedDisorders: [] as string[],
    lore: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const toggleDisorder = (disorderId: string) => {
    setForm(prev => {
      const selected = prev.selectedDisorders.includes(disorderId)
        ? prev.selectedDisorders.filter(id => id !== disorderId)
        : [...prev.selectedDisorders, disorderId]
      return { ...prev, selectedDisorders: selected }
    })
    if (errors.selectedDisorders) setErrors(prev => ({ ...prev, selectedDisorders: '' }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Имя обязательно для заполнения'
    if (!form.age.trim()) newErrors.age = 'Возраст обязателен для заполнения'
    else if (Number(form.age) < 1 || Number(form.age) > 120) newErrors.age = 'Введите корректный возраст (1-120)'
    if (form.selectedDisorders.length === 0) newErrors.selectedDisorders = 'Выберите хотя бы одно расстройство'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const API_URL = 'http://localhost:8001'
      
      const response = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          disorder: form.selectedDisorders.map(id => {
            const d = DISORDERS.find(d => d.id === id)
            return d ? d.code : id
          }).join(', '),
          severity: form.severity,
          lore: form.lore,
          mode: mode,
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ошибка создания: ${error}`)
      }

      const patient = await response.json()
      const patientId = patient.id

      if (mode === 'diagnostics') {
        navigate(`/session/diagnostics/${patientId}`)
      } else {
        navigate(`/session/therapy/${patientId}`)
      }

    } catch (error) {
      console.error('Ошибка создания пациента:', error)
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Не удалось создать пациента'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '20px',
    }}>
      <div style={{
        background: C.surface,
        borderRadius: C.radiusLg,
        padding: '40px',
        maxWidth: '640px',
        width: '100%',
        boxShadow: C.shadowMd,
      }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px' }}>🫂</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>Новый пациент</h1>
          </div>
          <p style={{ color: C.textSecondary, fontSize: '14px', margin: 0 }}>
            Режим: <strong>{mode === 'diagnostics' ? 'Диагностика' : 'Терапия'}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Имя */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '4px' }}>
              Имя <span style={{ color: C.danger }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Введите имя пациента"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1.5px solid ${errors.name ? C.danger : C.border}`,
                borderRadius: C.radius,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && <div style={{ color: C.danger, fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
          </div>

          {/* Возраст + Пол (рядом) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '4px' }}>
                Возраст <span style={{ color: C.danger }}>*</span>
              </label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                placeholder="Лет"
                min="1"
                max="120"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1.5px solid ${errors.age ? C.danger : C.border}`,
                  borderRadius: C.radius,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.age && <div style={{ color: C.danger, fontSize: '12px', marginTop: '4px' }}>{errors.age}</div>}
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '4px' }}>
                Пол
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1.5px solid ${C.border}`,
                  borderRadius: C.radius,
                  fontSize: '14px',
                  outline: 'none',
                  background: C.surface,
                  boxSizing: 'border-box',
                }}
              >
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
                <option value="Небинарный">Небинарный</option>
              </select>
            </div>
          </div>

          {/* Выраженность */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '8px' }}>
              Выраженность расстройства
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {SEVERITIES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, severity: s.id }))}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: C.radius,
                    border: `2px solid ${form.severity === s.id ? C.accent : C.border}`,
                    background: form.severity === s.id ? C.accentSoft : 'transparent',
                    color: form.severity === s.id ? C.accent : C.textSecondary,
                    fontWeight: form.severity === s.id ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Расстройства (мультивыбор) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '8px' }}>
              Расстройства <span style={{ color: C.danger }}>*</span>
              <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                (выберите одно или несколько)
              </span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              border: `1.5px solid ${errors.selectedDisorders ? C.danger : C.border}`,
              borderRadius: C.radius,
              padding: '12px',
            }}>
              {DISORDERS.map(d => {
                const isSelected = form.selectedDisorders.includes(d.id)
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDisorder(d.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: C.radius,
                      border: `2px solid ${isSelected ? C.accent : C.border}`,
                      background: isSelected ? C.accentSoft : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? C.accent : C.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `2px solid ${isSelected ? C.accent : C.border}`,
                      background: isSelected ? C.accent : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span>
                      <span style={{ fontWeight: 700, color: C.textMuted }}>{d.code}</span>{' '}
                      {d.name}
                    </span>
                  </div>
                )
              })}
            </div>
            {errors.selectedDisorders && (
              <div style={{ color: C.danger, fontSize: '12px', marginTop: '4px' }}>{errors.selectedDisorders}</div>
            )}
            <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>
              Выбрано: <strong>{form.selectedDisorders.length}</strong> из {DISORDERS.length}
            </div>
          </div>

          {/* Жизненная история */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, display: 'block', marginBottom: '4px' }}>
              Жизненная история
            </label>
            <textarea
              name="lore"
              value={form.lore}
              onChange={handleChange}
              placeholder="Опишите жизненную историю пациента, его особенности, травмы, важные события..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1.5px solid ${C.border}`,
                borderRadius: C.radius,
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: C.radius,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.textSecondary,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                padding: '12px 0',
                borderRadius: C.radius,
                border: 'none',
                background: C.accent,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Создание...' : 'Создать пациента'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}