import { useState, useEffect, useCallback } from 'react'

export type Targets = 'cat' | 'dog' | 'person' | 'bicycle' | 'car' | 'motorcycle'
export interface Settings {
  targets: Targets[]
  interval: number
  cooldown: number
  confidence: number
}

const DEFAULTS: Settings = { targets: ['cat', 'dog'], interval: 500, cooldown: 2000, confidence: 0.5 }

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem('spotter-settings')
      if (!raw) return DEFAULTS
      const parsed = JSON.parse(raw)
      return {
        targets: Array.isArray(parsed.targets) ? parsed.targets.filter(t => ['cat','dog','person','bicycle','car','motorcycle'].includes(t)) : DEFAULTS.targets,
        interval: Math.min(Math.max(Math.round((Number(parsed.interval) || 500) / 50) * 50, 100), 2000),
        cooldown: Math.min(Math.max(Math.round((Number(parsed.cooldown) || 2000) / 500) * 500, 0), 30000),
        confidence: Math.min(Math.max(parseFloat(String(parsed.confidence)) || 0.5, 0.10), 0.95),
      }
    } catch { return DEFAULTS }
  })

  useEffect(() => localStorage.setItem('spotter-settings', JSON.stringify(settings)), [settings])
  const update = useCallback((key: keyof Settings, val: any) => setSettings(s => ({ ...s, [key]: val })), [])
  const reset = useCallback(() => setSettings(DEFAULTS), [])
  return { settings, update, reset }
}