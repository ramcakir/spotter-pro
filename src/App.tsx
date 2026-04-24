import { useState, useCallback } from 'react'
import { useSettings } from './hooks/useSettings'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useCustomSounds } from './hooks/useCustomSounds'
import { useCameraDetection } from './hooks/useCameraDetection'
import { useWakeLock } from './hooks/useWakeLock'
import { SettingsModal } from './components/SettingsModal'
import { InstallPrompt } from './components/InstallPrompt'

export default function App() {
  const { settings, update, reset } = useSettings()
  const { customSounds, hasCustomSound, getCustomSound } = useCustomSounds()
  const { play } = useAudioEngine({ getCustomSound, hasCustomSound })
  const [running, setRunning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Prevent screen from sleeping while camera is active
  useWakeLock(running)

  const handleHit = useCallback((label: string) => {
    play(label)
  }, [play])

  const { videoRef, canvasRef, status, error, stats, toggleCamera } = useCameraDetection(
    settings, 
    handleHit, 
    running
  )

  const handleStart = () => {
    setRunning(p => !p)
  }

  const canRun = settings.targets.length > 0

  return (
    <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#ec5b2c] tracking-tight">Spotter Pro</h1>
          <p className="text-sm text-slate-500">
            Watching for: {settings.targets.length ? settings.targets.join(', ') : 'nothing'}
          </p>
          {Object.keys(customSounds).length > 0 && (
            <p className="text-xs text-teal-600 mt-1">
              🎵 {Object.keys(customSounds).length} custom sound(s) active
            </p>
          )}
        </div>
        <button 
          onClick={() => setSettingsOpen(true)} 
          className="p-2 rounded-full active:scale-95 bg-slate-100 shadow-sm"
        >
          ⚙️
        </button>
      </header>

      <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner mb-4">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${!running ? 'opacity-0' : 'opacity-100'}`} 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none" 
        />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            Loading model…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
            <p className="font-medium">{error}</p>
            <p className="text-sm text-slate-300 mt-2">Check camera permissions & reload</p>
          </div>
        )}
        {!running && (
          <button 
            onClick={canRun ? handleStart : undefined} 
            disabled={!canRun}
            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-medium backdrop-blur-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Loading…' : 'Start Camera'}
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <button 
          onClick={handleStart} 
          disabled={status === 'error' || status === 'loading' || !canRun}
          className={`flex-1 py-3 rounded-xl font-semibold shadow-md active:scale-[0.98] transition ${
            running ? 'bg-red-500 text-white' : 'bg-[#ec5b2c] text-white'
          }`}
        >
          {running ? 'Stop' : 'Start'}
        </button>
        <button 
          onClick={toggleCamera} 
          disabled={!running} 
          className="px-4 py-3 rounded-xl bg-slate-200 font-medium active:scale-[0.98] transition disabled:opacity-40"
        >
          🔄 Flip
        </button>
        <select 
          onChange={e => e.target.value && play(e.target.value)} 
          className="flex-1 bg-slate-200 rounded-xl px-2 font-medium active:scale-[0.98]"
          defaultValue=""
        >
          <option value="" disabled>Test ring</option>
          {['cat','dog','person','bicycle','car','motorcycle'].map(t => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {hasCustomSound(t) ? ' 🎵' : ''}
            </option>
          ))}
        </select>
      </div>

      {!canRun && (
        <p className="text-center text-amber-600 bg-amber-50 p-2 rounded-lg mb-3 text-sm">
          Select at least one target in Settings to start.
        </p>
      )}

      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
        <div className="flex justify-between text-sm text-slate-600 mb-1">
          <span>Detections: <b className="text-slate-900">{stats.count}</b></span>
          <span>Last: <b className="text-slate-900">{stats.last || '—'}</b></span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-teal-500 rounded-full transition-all duration-100" 
            style={{ width: `${(1 - stats.cooldownProgress) * 100}%` }} 
          />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right">Cooldown</p>
      </div>

      <InstallPrompt />
      <SettingsModal 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        settings={settings} 
        onUpdate={update} 
        onReset={reset} 
      />
    </div>
  )
}