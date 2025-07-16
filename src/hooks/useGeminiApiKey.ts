import { useState, useEffect, useCallback } from 'react'
import { getGeminiApiKey, setGeminiApiKey } from '@/utils/storage'

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    async function loadApiKey() {
      const storedKey = await getGeminiApiKey()
      setApiKey(storedKey)
      setIsLoaded(true)
    }
    loadApiKey()
  }, [])

  const saveApiKey = useCallback(async (newKey: string) => {
    await setGeminiApiKey(newKey)
    setApiKey(newKey)
  }, [])

  return { apiKey, isLoaded, saveApiKey }
}
