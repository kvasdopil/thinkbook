import localforage from 'localforage';

const STORAGE_KEYS = {
  GEMINI_API_KEY: 'gemini-api-key',
  SNOWFLAKE_ACCESS_TOKEN: 'snowflake-access-token',
  SNOWFLAKE_HOSTNAME: 'snowflake-hostname',
} as const;

export const storage = {
  async getGeminiApiKey(): Promise<string | null> {
    return await localforage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
  },

  async setGeminiApiKey(key: string): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
  },

  async getSnowflakeAccessToken(): Promise<string | null> {
    return await localforage.getItem(STORAGE_KEYS.SNOWFLAKE_ACCESS_TOKEN);
  },

  async setSnowflakeAccessToken(token: string): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.SNOWFLAKE_ACCESS_TOKEN, token);
  },

  async getSnowflakeHostname(): Promise<string | null> {
    return await localforage.getItem(STORAGE_KEYS.SNOWFLAKE_HOSTNAME);
  },

  async setSnowflakeHostname(hostname: string): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.SNOWFLAKE_HOSTNAME, hostname);
  },

  async hasAllRequiredConfig(): Promise<boolean> {
    const [geminiKey, snowflakeToken, snowflakeHostname] = await Promise.all([
      this.getGeminiApiKey(),
      this.getSnowflakeAccessToken(),
      this.getSnowflakeHostname(),
    ]);

    return !!(geminiKey && snowflakeToken && snowflakeHostname);
  },
};
