import { useState, useEffect, useRef } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { AiChat, type AiChatHandle } from './components/AiChat';
import { NotebookFilePanel } from './components/NotebookFilePanel';
import { NotebookHeader } from './components/NotebookHeader';
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
  const { activeFile, updateFile } = useNotebookFiles();
  const { isNotebookPanelCollapsed, toggleNotebookPanel } = useUiStore();
  const aiChatRef = useRef<AiChatHandle>(null);

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
    } else if (!activeFile && currentNotebook) {
      // Clear the current notebook if there's no active file
      setCurrentNotebook(null);
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

  const handleTitleUpdate = (id: string, title: string) => {
    updateFile(id, { title });
  };

  const handleRunAll = () => {
    aiChatRef.current?.runAllCells();
  };

  const handleAddCell = () => {
    // The add cell logic is handled directly in the NotebookHeader
    // This callback can be used for additional actions if needed
  };

  // Get the last message ID from the current notebook for manual cell creation
  const lastMessageId =
    currentNotebook?.messages && currentNotebook.messages.length > 0
      ? currentNotebook.messages[currentNotebook.messages.length - 1]?.id
      : undefined;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <main className="flex-1 flex overflow-hidden">
        <NotebookFilePanel
          onFileSelect={handleFileSelect}
          onNewFile={handleNewFile}
        />
        <div className="flex-1 flex flex-col">
          <NotebookHeader
            isNotebookPanelCollapsed={isNotebookPanelCollapsed}
            toggleNotebookPanel={toggleNotebookPanel}
            activeFile={activeFile}
            onTitleUpdate={handleTitleUpdate}
            onSettingsClick={handleSettingsClick}
            onRunAll={handleRunAll}
            onAddCell={handleAddCell}
            lastMessageId={lastMessageId}
          />
          <AiChat ref={aiChatRef} currentNotebook={currentNotebook} />
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
