import localforage from 'localforage'
import { SnowflakeConfig } from '@/types/snowflake'

const GEMINI_API_KEY = 'gemini-api-key'
const SNOWFLAKE_ACCESS_TOKEN = 'snowflake-access-token'
const SNOWFLAKE_HOSTNAME = 'snowflake-hostname'

export async function getGeminiApiKey(): Promise<string | null> {
  return localforage.getItem<string>(GEMINI_API_KEY)
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  await localforage.setItem(GEMINI_API_KEY, apiKey)
}

export async function getSnowflakeConfig(): Promise<SnowflakeConfig> {
  const accessToken = await localforage.getItem<string>(SNOWFLAKE_ACCESS_TOKEN)
  const hostname = await localforage.getItem<string>(SNOWFLAKE_HOSTNAME)
  return { accessToken, hostname }
}

export async function setSnowflakeConfig(
  config: SnowflakeConfig
): Promise<void> {
  if (config.accessToken) {
    await localforage.setItem(SNOWFLAKE_ACCESS_TOKEN, config.accessToken)
  }
  if (config.hostname) {
    await localforage.setItem(SNOWFLAKE_HOSTNAME, config.hostname)
  }
}
