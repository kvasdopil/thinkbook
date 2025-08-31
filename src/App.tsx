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
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">TB2 Notebook</h1>
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

      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Hello World</h2>
          <p className="text-gray-600">
            Configure your settings to get started
          </p>
        </div>
        
        <AiChat />
        
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4">
          <div className="text-sm text-gray-600 mb-2">Code Cell Placeholder</div>
          <div className="bg-white rounded border p-3 font-mono text-sm">
            # This is where a code cell would be
            print("Hello, World!")
          </div>
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
