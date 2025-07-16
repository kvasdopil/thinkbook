import { useState, useEffect, useCallback } from 'react'
import { getSnowflakeConfig, setSnowflakeConfig } from '../utils/storage'
import { SnowflakeConfig } from '@/types/snowflake'

export function useSnowflakeConfig() {
  const [config, setConfig] = useState<SnowflakeConfig>({
    accessToken: null,
    hostname: null,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      const storedConfig = await getSnowflakeConfig()
      setConfig(storedConfig || { accessToken: null, hostname: null })
      setIsLoaded(true)
    }
    fetchConfig()
  }, [])

  const saveSnowflakeConfig = useCallback(async (newConfig: SnowflakeConfig) => {
    await setSnowflakeConfig(newConfig)
    setConfig(newConfig)
  }, [])

  return { snowflakeConfig: config, saveSnowflakeConfig, isLoaded }
}
