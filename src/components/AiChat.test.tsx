import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AiChat } from './AiChat';
import * as useGeminiApiKeyHook from '../hooks/useGeminiApiKey';
import * as aiSdk from 'ai';
import * as googleSdk from '@ai-sdk/google';

vi.mock('../hooks/useGeminiApiKey');
vi.mock('ai');
vi.mock('@ai-sdk/google');

const mockUseGeminiApiKey = useGeminiApiKeyHook.useGeminiApiKey as Mock;
const mockStreamText = aiSdk.streamText as Mock;
const mockGoogle = googleSdk.google as Mock;

describe('AiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('shows configuration message when API key is not available', () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: null,
      hasApiKey: false,
    });

    render(<AiChat />);

    expect(screen.getByText('AI Chat is not available')).toBeInTheDocument();
    expect(screen.getByText(/Please configure your Gemini API key/)).toBeInTheDocument();
  });

  it('renders chat interface when API key is available', () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    render(<AiChat />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask the AI assistant...')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation with the AI assistant')).toBeInTheDocument();
  });

  it('shows alert when trying to send message without API key', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: null,
      hasApiKey: false,
    });

    render(<AiChat />);

    expect(screen.getByText('AI Chat is not available')).toBeInTheDocument();
  });

  it('displays user message immediately when sent', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockGoogle.mockReturnValue(mockModel);

    const mockTextStream = {
      async *[Symbol.asyncIterator]() {
        yield 'Hello';
        yield ' there!';
      },
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream,
    });

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('handles streaming AI response', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockGoogle.mockReturnValue(mockModel);

    const mockTextStream = {
      async *[Symbol.asyncIterator]() {
        yield 'Hello';
        yield ' there!';
      },
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream,
    });

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('shows thinking state while loading', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockGoogle.mockReturnValue(mockModel);

    let resolveStreamText: (value: { textStream: AsyncIterable<string> }) => void;
    const streamTextPromise = new Promise(resolve => {
      resolveStreamText = resolve;
    });
    mockStreamText.mockReturnValue(streamTextPromise);

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    resolveStreamText!({
      textStream: {
        async *[Symbol.asyncIterator]() {
          yield 'Response';
        },
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockGoogle.mockReturnValue(mockModel);
    mockStreamText.mockRejectedValue(new Error('API Error'));

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to get response from AI. Please try again.')).toBeInTheDocument();
    });
  });
});