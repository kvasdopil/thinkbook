import { useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { SettingsModal } from './components/SettingsModal';
import { AiChat } from './components/AiChat';
import { NotebookFilePanel } from './components/NotebookFilePanel';
import { useNotebookFiles } from './hooks/useNotebookFiles';
import { useUiStore } from './store/uiStore';
import type { SettingsConfig } from './components/SettingsModal';
import type { NotebookFile } from './types/notebook';
import { storage } from './utils/storage';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<NotebookFile | null>(
    null,
  );
  const { activeFile } = useNotebookFiles();
  const { isNotebookPanelCollapsed, toggleNotebookPanel } = useUiStore();

  useEffect(() => {
    const checkInitialConfig = async () => {
      const hasAllConfig = await storage.hasAllRequiredConfig();
      if (!hasAllConfig) {
        setIsSettingsOpen(true);
      }
    };

    checkInitialConfig();
  }, []);

  // Auto-open last active file on page load and sync with activeFile changes
  useEffect(() => {
    if (
      activeFile &&
      (!currentNotebook || currentNotebook.id !== activeFile.id)
    ) {
      setCurrentNotebook(activeFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.id, currentNotebook?.id]); // Only depend on IDs, not full objects

  const handleFileSelect = (file: NotebookFile) => {
    setCurrentNotebook(file);
  };

  const handleNewFile = (file: NotebookFile) => {
    setCurrentNotebook(file);
  };

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
          <div className="flex items-center gap-3">
            <button
              onClick={toggleNotebookPanel}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isNotebookPanelCollapsed ? "Show notebook panel" : "Hide notebook panel"}
              title={isNotebookPanelCollapsed ? "Show notebook panel" : "Hide notebook panel"}
            >
              {isNotebookPanelCollapsed ? (
                <FaChevronRight className="w-4 h-4" />
              ) : (
                <FaChevronLeft className="w-4 h-4" />
              )}
            </button>
            <h1 className="text-2xl font-bold outline-none">AI Chat Assistant</h1>
          </div>
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

      <main className="flex-1 flex overflow-hidden">
        <NotebookFilePanel
          onFileSelect={handleFileSelect}
          onNewFile={handleNewFile}
        />
        <div className="flex-1 flex flex-col">
          <AiChat currentNotebook={currentNotebook} />
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
