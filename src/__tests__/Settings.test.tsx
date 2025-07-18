/* eslint-disable react/display-name */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Home from '../components/Home'
import { useGeminiApiKey } from '../hooks/useGeminiApiKey'
import { useSnowflakeConfig } from '../hooks/useSnowflakeConfig'
import '@testing-library/jest-dom'

jest.mock('../hooks/useGeminiApiKey')
jest.mock('../hooks/useSnowflakeConfig')
jest.mock('../components/ConversationList', () => () => (
  <div>Mock Conversation List Component</div>
))
jest.mock('../components/FixedChatInput', () => () => (
  <div>Mock Fixed Chat Input Component</div>
))

const mockUseGeminiApiKey = useGeminiApiKey as jest.Mock
const mockUseSnowflakeConfig = useSnowflakeConfig as jest.Mock

const mockActiveFile = {
  id: '1',
  title: 'Test Title',
  cells: [],
  messages: [],
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
}

describe('Settings', () => {
  beforeEach(() => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: 'test-key', isLoaded: true })
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: 'test-host' },
      isLoaded: true,
    })
  })

  it('opens modal automatically if Gemini key is missing', async () => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: null, isLoaded: true })
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={() => {}}
          onDelete={jest.fn()}
        />
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('opens modal automatically if Snowflake access token is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: null, hostname: 'test-host' },
      isLoaded: true,
    })
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={() => {}}
          onDelete={jest.fn()}
        />
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('opens modal automatically if Snowflake hostname is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: null },
      isLoaded: true,
    })
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={() => {}}
          onDelete={jest.fn()}
        />
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('opens the settings modal when the settings button is clicked', async () => {
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={() => {}}
          onDelete={jest.fn()}
        />
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Settings'))
    })
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })
})
