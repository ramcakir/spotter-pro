import { useState, useEffect, useCallback } from 'react'

export interface CustomSound {
  name: string
  dataUrl: string
  duration?: number
}

const DB_NAME = 'spotter-sounds'
const STORE_NAME = 'custom-sounds'
const DB_VERSION = 1

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'target' })
      }
    }
  })
}

// Get all custom sounds
const getAllSounds = async (): Promise<Record<string, CustomSound>> => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const sounds: Record<string, CustomSound> = {}
        request.result.forEach(item => {
          sounds[item.target] = item.sound
        })
        resolve(sounds)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to load sounds from IndexedDB:', err)
    return {}
  }
}

// Save a single sound
const saveSound = async (target: string, sound: CustomSound): Promise<void> => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({ target, sound })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to save sound to IndexedDB:', err)
    throw err
  }
}

// Delete a sound
const deleteSound = async (target: string): Promise<void> => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(target)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to delete sound from IndexedDB:', err)
    throw err
  }
}

export function useCustomSounds() {
  const [customSounds, setCustomSounds] = useState<Record<string, CustomSound>>({})
  const [isUploading, setIsUploading] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load custom sounds from IndexedDB on mount
  useEffect(() => {
    const loadSounds = async () => {
      setIsLoading(true)
      const sounds = await getAllSounds()
      setCustomSounds(sounds)
      setIsLoading(false)
    }
    loadSounds()
  }, [])

  const uploadSound = useCallback(async (target: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsUploading(target)
      
      // Validate file type
      if (!file.type.includes('audio')) {
        setIsUploading(null)
        reject(new Error('Please upload an audio file'))
        return
      }

      // Validate file size (max 10MB per file for IndexedDB)
      if (file.size > 10 * 1024 * 1024) {
        setIsUploading(null)
        reject(new Error('File size must be less than 10MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        const sound: CustomSound = {
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          duration: 0
        }
        
        try {
          await saveSound(target, sound)
          setCustomSounds(prev => ({
            ...prev,
            [target]: sound
          }))
          setIsUploading(null)
          resolve()
        } catch (err) {
          setIsUploading(null)
          reject(new Error('Failed to save sound'))
        }
      }
      reader.onerror = () => {
        setIsUploading(null)
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const removeSound = useCallback(async (target: string) => {
    try {
      await deleteSound(target)
      setCustomSounds(prev => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    } catch (err) {
      console.error('Failed to remove sound:', err)
    }
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
    isUploading,
    isLoading
  }
}
