import { useRef, useEffect, useCallback } from 'react'
import { CustomSound } from './useCustomSounds'

interface UseAudioEngineProps {
  getCustomSound?: (target: string) => CustomSound | undefined
  hasCustomSound?: (target: string) => boolean
}

export function useAudioEngine(props?: UseAudioEngineProps) {
  const ctxRef = useRef<AudioContext | null>(null)
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({})

  useEffect(() => {
    return () => {
      // Clean up audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      if (ctxRef.current) {
        ctxRef.current.close()
      }
    }
  }, [])

  const play = useCallback((target: string) => {
    // Check for custom sound first
    if (props?.hasCustomSound?.(target)) {
      const customSound = props.getCustomSound?.(target)
      if (customSound?.dataUrl) {
        // Clean up previous audio for this target
        if (audioElementsRef.current[target]) {
          audioElementsRef.current[target].pause()
        }

        // Create new audio element
        const audio = new Audio(customSound.dataUrl)
        audio.volume = 0.8
        audioElementsRef.current[target] = audio
        
        // Play the audio
        audio.play().catch(err => {
          console.error(`Failed to play custom sound for ${target}:`, err)
          // Fallback to synthesized sound
          playSynthesized(target)
        })
        return
      }
    }

    // Use synthesized sound
    playSynthesized(target)
  }, [props])

  // Synthesized sound engine (same as before)
  const playSynthesized = (target: string) => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    const tone = (freq: number, type: OscillatorType, start: number, dur: number, vol = 0.3, filterFreq?: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = type
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      if (filterFreq) {
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(filterFreq, now + start)
        filter.frequency.exponentialRampToValueAtTime(100, now + start + dur)
        osc.connect(filter).connect(gain)
      } else {
        osc.connect(gain)
      }
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.05)
    }

    const noise = (start: number, dur: number, vol = 0.15) => {
      const bufferSize = Math.floor(ctx.sampleRate * dur)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      src.buffer = buffer
      filter.type = 'bandpass'
      filter.frequency.value = 800
      filter.Q.value = 1
      gain.gain.setValueAtTime(vol, now + start)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      src.connect(filter).connect(gain).connect(ctx.destination)
      src.start(now + start)
      src.stop(now + start + dur + 0.05)
    }

    switch (target) {
      case 'cat':
        [0, 0.12, 0.24].forEach((t, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(1600 + i * 200, now + t)
          osc.frequency.exponentialRampToValueAtTime(2200 + i * 150, now + t + 0.04)
          osc.frequency.exponentialRampToValueAtTime(1400 + i * 100, now + t + 0.09)
          gain.gain.setValueAtTime(0.001, now + t)
          gain.gain.linearRampToValueAtTime(0.35, now + t + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1)
          osc.connect(gain).connect(ctx.destination)
          osc.start(now + t)
          osc.stop(now + t + 0.12)
        })
        break

      case 'dog':
        [0, 0.18].forEach((t) => {
          tone(120, 'square', t, 0.14, 0.35, 600)
          tone(160, 'sawtooth', t, 0.12, 0.2, 400)
          noise(t, 0.12, 0.15)
        })
        break

      case 'person':
        [0, 0.35].forEach((t, i) => {
          const f = i === 0 ? 659.25 : 523.25
          tone(f, 'sine', t, 0.25, 0.4)
          tone(f * 2, 'sine', t, 0.15, 0.1)
          tone(f * 3.5, 'sine', t, 0.08, 0.05)
        })
        break

      case 'bicycle':
        [0, 0.25].forEach(t => {
          tone(2400, 'sine', t, 0.15, 0.35, 3000)
          tone(4800, 'sine', t, 0.1, 0.15, 5000)
          tone(7200, 'sine', t, 0.06, 0.08, 6000)
        })
        break

      case 'car':
        tone(330, 'sawtooth', 0, 0.45, 0.35, 800)
        tone(415.3, 'sawtooth', 0, 0.45, 0.35, 800)
        tone(331.5, 'square', 0.02, 0.4, 0.15, 600)
        break

      case 'motorcycle':
        {
          const revOsc1 = ctx.createOscillator()
          const revOsc2 = ctx.createOscillator()
          const revGain = ctx.createGain()
          const revFilter = ctx.createBiquadFilter()
          revOsc1.type = 'sawtooth'
          revOsc2.type = 'square'
          revFilter.type = 'lowpass'
          revOsc1.frequency.setValueAtTime(110, now)
          revOsc1.frequency.exponentialRampToValueAtTime(280, now + 0.7)
          revOsc2.frequency.setValueAtTime(112, now)
          revOsc2.frequency.exponentialRampToValueAtTime(285, now + 0.7)
          revFilter.frequency.setValueAtTime(400, now)
          revFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.5)
          revGain.gain.setValueAtTime(0.001, now)
          revGain.gain.linearRampToValueAtTime(0.3, now + 0.05)
          revGain.gain.linearRampToValueAtTime(0.35, now + 0.4)
          revGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85)
          revOsc1.connect(revFilter)
          revOsc2.connect(revFilter)
          revFilter.connect(revGain).connect(ctx.destination)
          revOsc1.start(now)
          revOsc2.start(now)
          revOsc1.stop(now + 0.9)
          revOsc2.stop(now + 0.9)
          noise(0, 0.6, 0.12)
        }
        break

      default:
        [0, 0.25, 0.5].forEach(t => {
          tone(880, 'square', t, 0.08, 0.2)
          tone(1318.51, 'square', t, 0.08, 0.2)
          tone(440, 'sine', t, 0.1, 0.25)
        })
    }
  }

  return { play, ctxRef }
}