import localforage from 'localforage'

const GEMINI_API_KEY = 'gemini-api-key'

export async function getGeminiApiKey(): Promise<string | null> {
  return localforage.getItem<string>(GEMINI_API_KEY)
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  await localforage.setItem(GEMINI_API_KEY, apiKey)
}
