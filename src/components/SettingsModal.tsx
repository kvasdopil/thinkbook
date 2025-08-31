import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SettingsConfig) => void;
}

export interface SettingsConfig {
  geminiApiKey: string;
  snowflakeAccessToken: string;
  snowflakeHostname: string;
}

export function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [config, setConfig] = useState<SettingsConfig>({
    geminiApiKey: '',
    snowflakeAccessToken: '',
    snowflakeHostname: '',
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const loadCurrentConfig = async () => {
        const [geminiKey, snowflakeToken, snowflakeHostname] =
          await Promise.all([
            storage.getGeminiApiKey(),
            storage.getSnowflakeAccessToken(),
            storage.getSnowflakeHostname(),
          ]);

        setConfig({
          geminiApiKey: geminiKey || '',
          snowflakeAccessToken: snowflakeToken || '',
          snowflakeHostname: snowflakeHostname || '',
        });
      };

      loadCurrentConfig();

      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleTabTrap = (e: KeyboardEvent) => {
      if (!isOpen || e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTabTrap);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  const handleInputChange = (field: keyof SettingsConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeHostname = (hostname: string) => {
    return hostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  const handleHostnameChange = (value: string) => {
    const normalized = normalizeHostname(value);
    handleInputChange('snowflakeHostname', normalized);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="settings-modal-title"
          className="text-xl font-semibold text-gray-900 mb-6"
        >
          Settings
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="gemini-api-key"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Gemini AI Key
            </label>
            <input
              ref={firstInputRef}
              id="gemini-api-key"
              type="password"
              value={config.geminiApiKey}
              onChange={(e) =>
                handleInputChange('geminiApiKey', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-describedby="gemini-key-help"
            />
            <p id="gemini-key-help" className="mt-1 text-xs text-gray-500">
              Enter your Gemini API key for AI functionality
            </p>
          </div>

          <div>
            <label
              htmlFor="snowflake-access-token"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Snowflake Access Token
            </label>
            <input
              id="snowflake-access-token"
              type="password"
              value={config.snowflakeAccessToken}
              onChange={(e) =>
                handleInputChange('snowflakeAccessToken', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-describedby="snowflake-token-help"
            />
            <p id="snowflake-token-help" className="mt-1 text-xs text-gray-500">
              Enter your Snowflake access token
            </p>
          </div>

          <div>
            <label
              htmlFor="snowflake-hostname"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Snowflake Hostname
            </label>
            <input
              id="snowflake-hostname"
              type="text"
              value={config.snowflakeHostname}
              onChange={(e) => handleHostnameChange(e.target.value)}
              placeholder="account.snowflakecomputing.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-describedby="snowflake-hostname-help"
            />
            <p
              id="snowflake-hostname-help"
              className="mt-1 text-xs text-gray-500"
            >
              Enter your Snowflake hostname (without https://)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
