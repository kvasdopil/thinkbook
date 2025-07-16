import { useState, useEffect } from 'react'
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey'
import { useSnowflakeConfig } from '@/hooks/useSnowflakeConfig'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKey, saveApiKey } = useGeminiApiKey()
  const { snowflakeConfig, saveSnowflakeConfig } = useSnowflakeConfig()
  const [geminiApiKey, setGeminiApiKey] = useState(apiKey || '')
  const [snowflakeToken, setSnowflakeToken] = useState(
    snowflakeConfig.accessToken || ''
  )
  const [snowflakeHostname, setSnowflakeHostname] = useState(
    snowflakeConfig.hostname || ''
  )

  useEffect(() => {
    if (apiKey) {
      setGeminiApiKey(apiKey)
    }
  }, [apiKey])

  useEffect(() => {
    setSnowflakeToken(snowflakeConfig.accessToken || '')
    setSnowflakeHostname(snowflakeConfig.hostname || '')
  }, [snowflakeConfig])

  const handleSave = async () => {
    await saveApiKey(geminiApiKey)
    await saveSnowflakeConfig({
      accessToken: snowflakeToken,
      hostname: snowflakeHostname,
    })
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="gemini-api-key"
              className="block text-sm font-medium text-gray-700"
            >
              Gemini AI Key
            </label>
            <input
              type="password"
              id="gemini-api-key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="snowflake-access-token"
              className="block text-sm font-medium text-gray-700"
            >
              Snowflake Access Token
            </label>
            <input
              type="password"
              id="snowflake-access-token"
              value={snowflakeToken}
              onChange={(e) => setSnowflakeToken(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="snowflake-hostname"
              className="block text-sm font-medium text-gray-700"
            >
              Snowflake Hostname
            </label>
            <input
              type="text"
              id="snowflake-hostname"
              value={snowflakeHostname}
              onChange={(e) => setSnowflakeHostname(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
