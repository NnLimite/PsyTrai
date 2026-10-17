import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const C = {
  surface: '#ffffff',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  accent: '#2d6a4f',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#ef4444',
  blue: '#3b82f6',
  purple: '#7c3aed',
}

interface StateHistoryEntry {
  ts: string
  openness: number
  trust: number
  distress: number
  symptom_level: number
  motivation: number
  stage: string
  session_count?: number
}

interface Props {
  patientId: string
  height?: number
  limit?: number
}

export default function StateChart({ patientId, height = 250, limit = 20 }: Props) {
  const [history, setHistory] = useState<StateHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string>('all')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8001/api/patients/${patientId}/state/history?limit=${limit}`)
        if (response.ok) {
          const data = await response.json()
          setHistory(data.history || [])
        }
      } catch (error) {
        console.error('Ошибка загрузки истории:', error)
        // Мок-данные для демонстрации
        const mockHistory = generateMockHistory(limit)
        setHistory(mockHistory)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [patientId, limit])

  const generateMockHistory = (count: number) => {
    const data = []
    let openness = 20, trust = 15, distress = 85, symptom = 90, motivation = 30
    for (let i = 0; i < count; i++) {
      openness = Math.min(100, Math.max(0, openness + (Math.random() - 0.3) * 8))
      trust = Math.min(100, Math.max(0, trust + (Math.random() - 0.2) * 6))
      distress = Math.min(100, Math.max(0, distress + (Math.random() - 0.4) * 10))
      symptom = Math.min(100, Math.max(0, symptom + (Math.random() - 0.3) * 8))
      motivation = Math.min(100, Math.max(0, motivation + (Math.random() - 0.1) * 5))
      data.push({
        ts: new Date(Date.now() - (count - i) * 60000).toISOString(),
        openness: Math.round(openness),
        trust: Math.round(trust),
        distress: Math.round(distress),
        symptom_level: Math.round(symptom),
        motivation: Math.round(motivation),
        stage: ['resistance', 'exploration', 'insight', 'integration'][Math.floor(Math.random() * 4)],
      })
    }
    return data
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 20, color: C.textMuted }}>Загрузка графика...</div>
  }

  if (history.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: C.textMuted }}>Нет данных для отображения</div>
  }

  const formattedData = history.map(h => ({
    ...h,
    time: new Date(h.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
  }))

  const metrics = [
    { key: 'openness', label: 'Открытость', color: C.success },
    { key: 'trust', label: 'Доверие', color: C.blue },
    { key: 'distress', label: 'Дистресс', color: C.danger },
    { key: 'symptom_level', label: 'Симптомы', color: C.warning },
    { key: 'motivation', label: 'Мотивация', color: C.purple },
  ]

  const visibleMetrics = selectedMetric === 'all' 
    ? metrics 
    : metrics.filter(m => m.key === selectedMetric)

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.textMuted }}>
          📊 Динамика состояния
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedMetric('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: `1px solid ${selectedMetric === 'all' ? C.accent : C.border}`,
              background: selectedMetric === 'all' ? C.accent : 'transparent',
              color: selectedMetric === 'all' ? '#fff' : C.textMuted,
              fontSize: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Все
          </button>
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                border: `1px solid ${selectedMetric === m.key ? m.color : C.border}`,
                background: selectedMetric === m.key ? m.color : 'transparent',
                color: selectedMetric === m.key ? '#fff' : C.textMuted,
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.textMuted }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.textMuted }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value: any) => [`${Math.round(value)}%`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {visibleMetrics.map(m => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}