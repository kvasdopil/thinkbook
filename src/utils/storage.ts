import localforage from 'localforage';
import { NotebookFile } from '@/components/FilePanel';

const NOTEBOOK_FILES_KEY = 'notebookFiles';
const LAST_ACTIVE_FILE_ID_KEY = 'lastActiveFileId';

export const saveNotebookFiles = async (files: Record<string, NotebookFile>) => {
  await localforage.setItem(NOTEBOOK_FILES_KEY, files);
};

export const loadNotebookFiles = async (): Promise<Record<string, NotebookFile> | null> => {
  return await localforage.getItem(NOTEBOOK_FILES_KEY);
};

export const saveLastActiveFileId = async (id: string) => {
  await localforage.setItem(LAST_ACTIVE_FILE_ID_KEY, id);
};

export const loadLastActiveFileId = async (): Promise<string | null> => {
  return await localforage.getItem(LAST_ACTIVE_FILE_ID_KEY);
};

const GEMINI_API_KEY = 'geminiApiKey';
export const getGeminiApiKey = async (): Promise<string | null> => {
    return await localforage.getItem(GEMINI_API_KEY);
}

export const setGeminiApiKey = async (key: string) => {
    await localforage.setItem(GEMINI_API_KEY, key);
}

const SNOWFLAKE_CONFIG_KEY = 'snowflakeConfig';
export const getSnowflakeConfig = async (): Promise<{ accessToken: string, hostname: string } | null> => {
    return await localforage.getItem(SNOWFLAKE_CONFIG_KEY);
}

export const setSnowflakeConfig = async (config: { accessToken: string, hostname: string }) => {
    await localforage.setItem(SNOWFLAKE_CONFIG_KEY, config);
}
