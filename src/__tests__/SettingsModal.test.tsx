import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import SettingsModal from '../components/SettingsModal'
import { useGeminiApiKey } from '../hooks/useGeminiApiKey'
import { useSnowflakeConfig } from '../hooks/useSnowflakeConfig'

// Mock the hooks
jest.mock('../hooks/useGeminiApiKey')
jest.mock('../hooks/useSnowflakeConfig')

const mockUseGeminiApiKey = useGeminiApiKey as jest.Mock
const mockUseSnowflakeConfig = useSnowflakeConfig as jest.Mock

describe('SettingsModal', () => {
  const mockOnClose = jest.fn()
  const mockSaveApiKey = jest.fn()
  const mockSaveSnowflakeConfig = jest.fn()

  beforeEach(() => {
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-api-key',
      saveApiKey: mockSaveApiKey,
    })
    
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: {
        accessToken: 'test-snowflake-token',
        hostname: 'test.snowflakecomputing.com',
      },
      saveSnowflakeConfig: mockSaveSnowflakeConfig,
    })
    
    mockOnClose.mockClear()
    mockSaveApiKey.mockClear()
    mockSaveSnowflakeConfig.mockClear()
  })

  it('renders correctly when open', async () => {
    await act(async () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    })

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemini AI Key')).toBeInTheDocument()
    expect(screen.getByLabelText('Snowflake Access Token')).toBeInTheDocument()
    expect(screen.getByLabelText('Snowflake Hostname')).toBeInTheDocument()
  })

  it('does not render when not open', async () => {
    await act(async () => {
      const { container } = render(<SettingsModal isOpen={false} onClose={mockOnClose} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    await act(async () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('×'))
    })
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls save functions and onClose when OK is clicked', async () => {
    await act(async () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    })

    const geminiInput = screen.getByLabelText('Gemini AI Key')
    const snowflakeTokenInput = screen.getByLabelText('Snowflake Access Token')
    const snowflakeHostnameInput = screen.getByLabelText('Snowflake Hostname')

    await act(async () => {
      fireEvent.change(geminiInput, { target: { value: 'new-api-key' } })
      fireEvent.change(snowflakeTokenInput, { target: { value: 'new-snowflake-token' } })
      fireEvent.change(snowflakeHostnameInput, { target: { value: 'new.snowflakecomputing.com' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('OK'))
    })

    expect(mockSaveApiKey).toHaveBeenCalledWith('new-api-key')
    expect(mockSaveSnowflakeConfig).toHaveBeenCalledWith({
      accessToken: 'new-snowflake-token',
      hostname: 'new.snowflakecomputing.com',
    })
    expect(mockOnClose).toHaveBeenCalled()
  })
})