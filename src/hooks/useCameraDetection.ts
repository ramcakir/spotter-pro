import { useRef, useState, useEffect, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import { Settings, Targets } from './useSettings'

export function useCameraDetection(settings: Settings, onHit: (label: Targets) => void, isRunning: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const intervalRef = useRef<number>(0)
  const lastRingRef = useRef(0)
  const countRef = useRef(0)
  
  const [status, setStatus] = useState<'idle'|'loading'|'error'|'active'>('idle')
  const [lastHit, setLastHit] = useState('')
  const [cdProgress, setCdProgress] = useState(0)
  const [facing, setFacing] = useState<'user'|'environment'>('environment')
  const [error, setError] = useState<string | null>(null)

  const startCam = useCallback(async (f: 'user'|'environment') => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: f }, 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
      setStatus('active')
      setError(null)
    } catch { 
      setError('Camera denied/unavailable')
      setStatus('error') 
    }
  }, [])

  const drawBox = (p: any, ctx: CanvasRenderingContext2D) => {
    const [x, y, w, h] = p.bbox
    ctx.strokeStyle = '#ec5b2c'
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = '#ec5b2c'
    ctx.font = '14px Inter'
    const txt = `${p.class} ${(p.score*100).toFixed(0)}%`
    const tw = ctx.measureText(txt).width + 10
    ctx.fillRect(x, y<20 ? y+h+4 : y-20, tw, 20)
    ctx.fillStyle = '#fff'
    ctx.fillText(txt, x+5, y<20 ? y+h+18 : y-4)
  }

  const run = useCallback(() => {
    if (!modelRef.current || !videoRef.current || !canvasRef.current || !isRunning) return
    modelRef.current.detect(videoRef.current).then(preds => {
      const ctx = canvasRef.current!.getContext('2d')!
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
      if (!isRunning) return
      
      let hit: any = null
      for (const p of preds) {
        const className = p.class as Targets
        if (!settings.targets.includes(className) || p.score < settings.confidence) continue
        if (!hit || p.score > hit.score) hit = p
        drawBox(p, ctx)
      }

      if (hit) {
        const now = Date.now()
        if (now - lastRingRef.current >= settings.cooldown) {
          lastRingRef.current = now
          countRef.current++
          setLastHit(hit.class)
          onHit(hit.class as Targets)
        } else {
          setCdProgress(1 - ((now - lastRingRef.current)/settings.cooldown))
        }
      }
    })
  }, [settings, isRunning, onHit])

  useEffect(() => {
    const v = videoRef.current, c = canvasRef.current
    if (v && c) {
      v.onloadedmetadata = () => { 
        c.width = v.videoWidth
        c.height = v.videoHeight 
      }
    }
  }, [status])

  useEffect(() => { 
    if (isRunning && !modelRef.current) { 
      setStatus('loading')
      tf.ready().then(() => {
        cocoSsd.load({base:'lite_mobilenet_v2'}).then(m => { 
          modelRef.current = m
          setStatus('active')
        })
      })
    } 
  }, [isRunning])

  useEffect(() => { 
    if (isRunning && modelRef.current) {
      intervalRef.current = setInterval(run, settings.interval) as any
    }
    return () => clearInterval(intervalRef.current) 
  }, [isRunning, settings.interval, run])

  useEffect(() => { 
    if (isRunning) startCam(facing) 
  }, [isRunning, facing, startCam])

  useEffect(() => { 
    if (!isRunning || lastRingRef.current===0 || settings.cooldown===0) {
      return setCdProgress(0)
    }
    const t = setInterval(() => {
      setCdProgress(Math.max(0, 1-(Date.now()-lastRingRef.current)/settings.cooldown))
    }, 50)
    return () => clearInterval(t) 
  }, [isRunning, settings.cooldown])

  useEffect(() => () => { 
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop()) 
  }, [])

  return { 
    videoRef, 
    canvasRef, 
    status, 
    error, 
    stats: { 
      count: countRef.current, 
      last: lastHit, 
      cooldownProgress: cdProgress 
    }, 
    toggleCamera: () => { 
      const next = facing === 'environment' ? 'user' : 'environment'
      setFacing(next)
      startCam(next)
    }, 
    facing 
  }
}
