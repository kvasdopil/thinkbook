import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export interface SnowflakeConfig {
  accessToken: string | null;
  hostname: string | null;
}

export function useSnowflakeConfig() {
  const [config, setConfig] = useState<SnowflakeConfig>({
    accessToken: null,
    hostname: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [accessToken, hostname] = await Promise.all([
          storage.getSnowflakeAccessToken(),
          storage.getSnowflakeHostname(),
        ]);
        setConfig({ accessToken, hostname });
      } catch (error) {
        console.error('Failed to load Snowflake config:', error);
        setConfig({ accessToken: null, hostname: null });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const updateConfig = async (newConfig: Partial<SnowflakeConfig>) => {
    try {
      if (
        newConfig.accessToken !== undefined &&
        newConfig.accessToken !== null
      ) {
        await storage.setSnowflakeAccessToken(newConfig.accessToken);
      }
      if (newConfig.hostname !== undefined && newConfig.hostname !== null) {
        await storage.setSnowflakeHostname(newConfig.hostname);
      }

      setConfig((current) => ({ ...current, ...newConfig }));
    } catch (error) {
      console.error('Failed to save Snowflake config:', error);
      throw error;
    }
  };

  return {
    config,
    isLoading,
    updateConfig,
    hasConfig: !!(config.accessToken && config.hostname),
  };
}
