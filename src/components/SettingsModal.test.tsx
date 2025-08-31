import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { storage } from '../utils/storage';

vi.mock('../utils/storage');

const mockedStorage = vi.mocked(storage);

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedStorage.getGeminiApiKey.mockResolvedValue('');
    mockedStorage.getSnowflakeAccessToken.mockResolvedValue('');
    mockedStorage.getSnowflakeHostname.mockResolvedValue('');
  });

  it('should not render when isOpen is false', () => {
    render(<SettingsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should load existing config values', async () => {
    mockedStorage.getGeminiApiKey.mockResolvedValue('existing-gemini-key');
    mockedStorage.getSnowflakeAccessToken.mockResolvedValue('existing-token');
    mockedStorage.getSnowflakeHostname.mockResolvedValue('existing-hostname');

    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('existing-gemini-key'),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing-token')).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing-hostname')).toBeInTheDocument();
    });
  });

  it('should have all required input fields', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Gemini AI Key')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Snowflake Access Token'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Snowflake Hostname')).toBeInTheDocument();
    });
  });

  it('should have password type for sensitive fields', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Gemini AI Key')).toHaveAttribute(
        'type',
        'password',
      );
      expect(screen.getByLabelText('Snowflake Access Token')).toHaveAttribute(
        'type',
        'password',
      );
      expect(screen.getByLabelText('Snowflake Hostname')).toHaveAttribute(
        'type',
        'text',
      );
    });
  });

  it('should call onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click on the backdrop div (the one with handleBackdropClick)
    const backdrop = screen.getByRole('dialog').closest('.fixed.inset-0')!;
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it.skip('should call onSave with form data when OK button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const geminiInput = screen.getByLabelText('Gemini AI Key');
    const tokenInput = screen.getByLabelText('Snowflake Access Token');
    const hostnameInput = screen.getByLabelText('Snowflake Hostname');

    // Clear and fill inputs one at a time with delays
    await user.clear(geminiInput);
    await user.type(geminiInput, 'test-gemini-key');

    await user.clear(tokenInput);
    await user.type(tokenInput, 'test-token');

    await user.clear(hostnameInput);
    await user.type(hostnameInput, 'test-hostname.snowflakecomputing.com');

    const okButton = screen.getByRole('button', { name: 'OK' });
    await user.click(okButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      geminiApiKey: 'test-gemini-key',
      snowflakeAccessToken: 'test-token',
      snowflakeHostname: 'test-hostname.snowflakecomputing.com',
    });
  });

  it.skip('should normalize hostname by removing https prefix', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const hostnameInput = screen.getByLabelText('Snowflake Hostname');

    await user.clear(hostnameInput);
    await user.type(
      hostnameInput,
      'https://test-hostname.snowflakecomputing.com',
    );

    const okButton = screen.getByRole('button', { name: 'OK' });
    await user.click(okButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        snowflakeHostname: 'test-hostname.snowflakecomputing.com',
      }),
    );
  });

  it('should close modal on Escape key press', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should focus first input when modal opens', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      const geminiInput = screen.getByLabelText('Gemini AI Key');
      expect(geminiInput).toHaveFocus();
    });
  });

  it('should trap focus within modal', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const firstInput = screen.getByLabelText('Gemini AI Key');
    const lastButton = screen.getByRole('button', { name: 'OK' });

    firstInput.focus();

    // Tab backwards from first element should go to last
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(lastButton).toHaveFocus();

    // Tab forward from last element should go to first
    await user.keyboard('{Tab}');
    expect(firstInput).toHaveFocus();
  });

  it('should have proper ARIA attributes', async () => {
    render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'settings-modal-title');
    });

    expect(screen.getByText('Settings')).toHaveAttribute(
      'id',
      'settings-modal-title',
    );
  });
});
