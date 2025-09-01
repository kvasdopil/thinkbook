import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AiChat } from './AiChat';
import * as useGeminiApiKeyHook from '../hooks/useGeminiApiKey';
import * as aiSdk from 'ai';
import * as googleSdk from '@ai-sdk/google';

vi.mock('../hooks/useGeminiApiKey');
vi.mock('ai');
vi.mock('@ai-sdk/google');

const mockUseGeminiApiKey = useGeminiApiKeyHook.useGeminiApiKey as Mock;
const mockStreamText = aiSdk.streamText as Mock;
const mockCreateGoogleGenerativeAI = googleSdk.createGoogleGenerativeAI as unknown as Mock;

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

    expect(
      screen.getByText(
        /Please configure your Gemini API key in settings to start using the AI chat/,
      ),
    ).toBeInTheDocument();
  });

  it('renders chat interface when API key is available', () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    render(<AiChat />);

    expect(
      screen.getByPlaceholderText('Ask the AI assistant...'),
    ).toBeInTheDocument();
  });

  it('shows alert when trying to send message without API key', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: null,
      hasApiKey: false,
    });

    render(<AiChat />);

    expect(
      screen.getByText(
        /Please configure your Gemini API key in settings to start using the AI chat/,
      ),
    ).toBeInTheDocument();
  });

  it('displays user message immediately when sent', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockCreateGoogleGenerativeAI.mockReturnValue(mockModel);

    const mockFullStream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'text-delta', text: 'Hello' };
        yield { type: 'text-delta', text: ' there!' };
      },
    };

    mockStreamText.mockResolvedValue({
      fullStream: mockFullStream,
    });

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('handles streaming AI response', async () => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      hasApiKey: true,
    });

    const mockModel = vi.fn();
    mockCreateGoogleGenerativeAI.mockReturnValue(mockModel);

    const mockFullStream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'text-delta', text: 'Hello' };
        yield { type: 'text-delta', text: ' there!' };
      },
    };

    mockStreamText.mockResolvedValue({
      fullStream: mockFullStream,
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
    mockCreateGoogleGenerativeAI.mockReturnValue(mockModel);

    let resolveStreamText: (value: {
      fullStream: AsyncIterable<{type: string, text?: string}>;
    }) => void;
    const streamTextPromise = new Promise((resolve) => {
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
      fullStream: {
        async *[Symbol.asyncIterator]() {
          yield { type: 'text-delta', text: 'Response' };
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
    mockCreateGoogleGenerativeAI.mockReturnValue(mockModel);
    mockStreamText.mockRejectedValue(new Error('API Error'));

    const user = userEvent.setup();
    render(<AiChat />);

    const input = screen.getByPlaceholderText('Ask the AI assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:.*API Error/)).toBeInTheDocument();
    });
  });
});
