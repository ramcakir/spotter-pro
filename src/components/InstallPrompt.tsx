import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferred, setDeferred] = useState<any>(null)

  useEffect(() => {
    if (localStorage.getItem('spotter-install-dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault(); setDeferred(e); setShow(true)
    })

    if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints && /MacIntel/.test(navigator.platform))) setShow(true)
  }, [])

  const install = async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; if (r.outcome==='accepted') localStorage.setItem('spotter-install-dismissed','true'); setDeferred(null) }
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 animate-fadeIn md:max-w-sm md:mx-auto">
      <p className="text-sm font-medium mb-3 text-center">{!deferred ? '📱 Add to Home Screen (Share → Add to Home Screen)' : '📲 Install as a native-like app?'}</p>
      <div className="flex gap-2">
        <button onClick={() => { localStorage.setItem('spotter-install-dismissed','true'); setShow(false) }} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm">Not now</button>
        {!deferred && <a href="https://support.apple.com/guide/iphone/iph42ab2f3a7/ios" target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg bg-slate-100 text-sm text-center">iOS Guide</a>}
        {deferred && <button onClick={install} className="flex-1 py-2 rounded-lg bg-[#ec5b2c] text-white font-medium active:scale-[0.98]">Install</button>}
      </div>
    </div>
  )
}