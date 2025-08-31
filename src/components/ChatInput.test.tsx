import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders with correct placeholder', () => {
    const onSendMessage = vi.fn();

    render(
      <ChatInput onSendMessage={onSendMessage} placeholder="Type here..." />,
    );

    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('calls onSendMessage when Send button is clicked', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, 'Test message');
    await user.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('calls onSendMessage when Enter key is pressed', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Test message{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not call onSendMessage when Shift+Enter is pressed', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Test message{Shift>}{Enter}{/Shift}');

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending message', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, 'Test message');
    expect(textarea.value).toBe('Test message');

    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('disables input and button when disabled prop is true', () => {
    const onSendMessage = vi.fn();

    render(<ChatInput onSendMessage={onSendMessage} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when input is empty', () => {
    const onSendMessage = vi.fn();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Test');

    expect(sendButton).not.toBeDisabled();
  });

  it('does not send empty or whitespace-only messages', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, '   ');
    await user.click(sendButton);

    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
