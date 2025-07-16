import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../components/Home';
import { useGeminiApiKey } from '../hooks/useGeminiApiKey';
import { useSnowflakeConfig } from '../hooks/useSnowflakeConfig';
import '@testing-library/jest-dom';

jest.mock('../hooks/useGeminiApiKey');
jest.mock('../hooks/useSnowflakeConfig');
jest.mock('../components/ConversationList', () => () => <div>Mock Conversation List Component</div>);
jest.mock('../components/FixedChatInput', () => () => <div>Mock Fixed Chat Input Component</div>);


const mockUseGeminiApiKey = useGeminiApiKey as jest.Mock;
const mockUseSnowflakeConfig = useSnowflakeConfig as jest.Mock;

describe('Settings', () => {
  beforeEach(() => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: 'test-key', isLoaded: true });
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: 'test-host' },
      isLoaded: true,
    });
  });

  it('opens modal automatically if Gemini key is missing', async () => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: null, isLoaded: true });
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('opens modal automatically if Snowflake access token is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: null, hostname: 'test-host' },
      isLoaded: true,
    });
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('opens modal automatically if Snowflake hostname is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: null },
      isLoaded: true,
    });
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('opens the settings modal when the settings button is clicked', async () => {
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
