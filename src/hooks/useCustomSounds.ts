import { useState, useEffect, useCallback } from 'react'

export interface CustomSound {
  name: string
  dataUrl: string
  duration?: number
}

const STORAGE_KEY = 'spotter-custom-sounds'

export function useCustomSounds() {
  const [customSounds, setCustomSounds] = useState<Record<string, CustomSound>>({})
  const [isUploading, setIsUploading] = useState<string | null>(null)

  // Load custom sounds from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setCustomSounds(parsed)
      }
    } catch (err) {
      console.error('Failed to load custom sounds:', err)
    }
  }, [])

  // Save to localStorage whenever sounds change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customSounds))
    } catch (err) {
      console.error('Failed to save custom sounds:', err)
    }
  }, [customSounds])

  const uploadSound = useCallback(async (target: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsUploading(target)
      
      // Validate file type
      if (!file.type.includes('audio')) {
        setIsUploading(null)
        reject(new Error('Please upload an audio file'))
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setIsUploading(null)
        reject(new Error('File size must be less than 5MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setCustomSounds(prev => ({
          ...prev,
          [target]: {
            name: file.name.replace(/\.[^/.]+$/, ''),
            dataUrl,
            duration: 0 // Could calculate if needed
          }
        }))
        setIsUploading(null)
        resolve()
      }
      reader.onerror = () => {
        setIsUploading(null)
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const removeSound = useCallback((target: string) => {
    setCustomSounds(prev => {
      const next = { ...prev }
      delete next[target]
      return next
    })
  }, [])

  const hasCustomSound = useCallback((target: string) => {
    return !!customSounds[target]
  }, [customSounds])

  const getCustomSound = useCallback((target: string) => {
    return customSounds[target]
  }, [customSounds])

  return {
    customSounds,
    uploadSound,
    removeSound,
    hasCustomSound,
    getCustomSound,
    isUploading
  }
}