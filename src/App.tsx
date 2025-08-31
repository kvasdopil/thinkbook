import { useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';
import { SettingsModal } from './components/SettingsModal';
import { AiChat } from './components/AiChat';
import type { SettingsConfig } from './components/SettingsModal';
import { storage } from './utils/storage';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const checkInitialConfig = async () => {
      const hasAllConfig = await storage.hasAllRequiredConfig();
      if (!hasAllConfig) {
        setIsSettingsOpen(true);
      }
    };

    checkInitialConfig();
  }, []);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleSettingsSave = async (config: SettingsConfig) => {
    try {
      await Promise.all([
        storage.setGeminiApiKey(config.geminiApiKey),
        storage.setSnowflakeAccessToken(config.snowflakeAccessToken),
        storage.setSnowflakeHostname(config.snowflakeHostname),
      ]);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="border-b border-gray-200 bg-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold outline-none">AI Chat Assistant</h1>
          <button
            onClick={handleSettingsClick}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open settings"
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col">
          <AiChat />
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
      />
    </div>
  );
}

export default App;
