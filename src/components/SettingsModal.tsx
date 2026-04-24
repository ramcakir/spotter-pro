import { useState, useRef } from 'react'
import { Settings, Targets } from '../hooks/useSettings'
import { useCustomSounds } from '../hooks/useCustomSounds'

const TARGETS: { key: Targets; label: string; icon: string }[] = [
  { key: 'cat', label: 'Cat', icon: '🐈' },
  { key: 'dog', label: 'Dog', icon: '🐕' },
  { key: 'person', label: 'Human', icon: '🧑' },
  { key: 'bicycle', label: 'Bicycle', icon: '🚲' },
  { key: 'car', label: 'Car', icon: '🚗' },
  { key: 'motorcycle', label: 'Motorcycle', icon: '🏍' }
]

interface Props {
  open: boolean
  onClose: () => void
  settings: Settings
  onUpdate: (k: keyof Settings, v: any) => void
  onReset: () => void
}

export function SettingsModal({ open, onClose, settings, onUpdate, onReset }: Props) {
  const { customSounds, uploadSound, removeSound, hasCustomSound, isUploading } = useCustomSounds()
  const [activeUpload, setActiveUpload] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (!open) return null

  const handleFileSelect = async (target: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await uploadSound(target, file)
      setActiveUpload(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      // Reset file input
      if (fileInputRefs.current[target]) {
        fileInputRefs.current[target]!.value = ''
      }
    }
  }

  const handleRemoveSound = (target: string) => {
    if (confirm(`Remove custom sound for ${target}?`)) {
      removeSound(target)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-[#faf6f2] w-full md:w-[520px] max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 shadow-2xl animate-slideUp" 
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        
        {/* Target Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-slate-600">Targets to Detect</p>
          <div className="grid grid-cols-2 gap-2">
            {TARGETS.map(t => (
              <button 
                key={t.key} 
                onClick={() => {
                  const sel = settings.targets.includes(t.key) 
                    ? settings.targets.filter(x => x !== t.key) 
                    : [...settings.targets, t.key]
                  onUpdate('targets', sel)
                }}
                className={`p-3 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
                  settings.targets.includes(t.key) 
                    ? 'bg-[#ec5b2c] text-white border-[#ec5b2c]' 
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Sound Uploaders */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-slate-600">Custom Sounds (Optional)</p>
          <div className="space-y-3">
            {TARGETS.map(target => (
              <div key={target.key} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{target.icon}</span>
                    <span className="font-medium text-sm">{target.label}</span>
                  </div>
                  {hasCustomSound(target.key) && (
                    <button
                      onClick={() => handleRemoveSound(target.key)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {hasCustomSound(target.key) ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                    ✓ Using: <em>{customSounds[target.key]?.name}</em>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
                    Using synthesized sound
                  </div>
                )}

                <input
                  type="file"
                  accept="audio/*"
                  ref={el => fileInputRefs.current[target.key] = el}
                  onChange={(e) => handleFileSelect(target.key, e)}
                  disabled={isUploading === target.key}
                  className="mt-2 w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#ec5b2c] file:text-white hover:file:bg-orange-600 transition disabled:opacity-50"
                />
                {isUploading === target.key && (
                  <p className="text-xs text-slate-500 mt-1">Uploading...</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            💡 Tip: Short clips (1-3 seconds) work best. Max 5MB per file.
          </p>
        </div>

        {/* Detection Interval */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Detection Interval</span>
            <span className="font-mono">{settings.interval}ms</span>
          </div>
          <input 
            type="range" 
            min={100} 
            max={2000} 
            step={50} 
            value={settings.interval} 
            onChange={e => onUpdate('interval', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#ec5b2c]" 
          />
        </div>

        {/* Ring Cooldown */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Ring Cooldown</span>
            <span className="font-mono">{settings.cooldown}ms</span>
          </div>
          <input 
            type="range" 
            min={0} 
            max={30000} 
            step={500} 
            value={settings.cooldown} 
            onChange={e => onUpdate('cooldown', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#ec5b2c]" 
          />
        </div>

        {/* Confidence Threshold */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Confidence Threshold</span>
            <span className="font-mono">{Math.round(settings.confidence * 100)}%</span>
          </div>
          <input 
            type="range" 
            min={0.1} 
            max={0.95} 
            step={0.05} 
            value={settings.confidence} 
            onChange={e => onUpdate('confidence', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#ec5b2c]" 
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button 
            onClick={onReset} 
            className="px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
          >
            Reset Defaults
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 rounded-xl bg-[#ec5b2c] text-white font-semibold active:scale-[0.98] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}