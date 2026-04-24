import { useEffect, useRef } from 'react'

export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    // Graceful fallback for unsupported browsers
    if (!isActive || !('wakeLock' in navigator)) return

    let mounted = true

    const requestWakeLock = async () => {
      try {
        if (mounted && document.visibilityState === 'visible') {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch (err) {
        console.warn('Wake Lock failed:', err)
      }
    }

    requestWakeLock()

    // Re-acquire lock when app becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount or when isActive changes
    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [isActive])
}