import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '@/app/page'
import SettingsModal from '@/components/SettingsModal'
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey'
import { useSnowflakeConfig } from '@/hooks/useSnowflakeConfig'

jest.mock('@/utils/storage', () => ({
  getGeminiApiKey: jest.fn(),
  setGeminiApiKey: jest.fn(),
  getSnowflakeConfig: jest.fn(),
  setSnowflakeConfig: jest.fn(),
}))

jest.mock('@/hooks/useGeminiApiKey')
jest.mock('@/hooks/useSnowflakeConfig')

jest.mock('react-markdown', () => (props: any) => <>{props.children}</>)

describe('Settings', () => {
  const mockUseGeminiApiKey = useGeminiApiKey as jest.Mock
  const mockUseSnowflakeConfig = useSnowflakeConfig as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mocks for a "happy path" where modal does not auto-open
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: 'test-key',
      isLoaded: true,
      saveApiKey: jest.fn(),
    })
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: {
        accessToken: 'test-token',
        hostname: 'test-host',
      },
      isLoaded: true,
      saveSnowflakeConfig: jest.fn(),
    })
  })

  it('opens modal automatically if Gemini key is missing', async () => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: null, isLoaded: true })
    render(<Home />)
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('opens modal automatically if Snowflake access token is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: null, hostname: 'test-host' },
      isLoaded: true,
    })
    render(<Home />)
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('opens modal automatically if Snowflake hostname is missing', async () => {
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: null },
      isLoaded: true,
    })
    render(<Home />)
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('does not open modal automatically if all configs are set', async () => {
    render(<Home />)
    // Wait for a moment to ensure no modal appears
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('opens the settings modal when the settings button is clicked', async () => {
    render(<Home />)
    fireEvent.click(screen.getByLabelText('Settings'))
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('saves all settings when the OK button is clicked', async () => {
    const saveApiKey = jest.fn()
    const saveSnowflakeConfig = jest.fn()
    mockUseGeminiApiKey.mockReturnValue({
      apiKey: null,
      isLoaded: true,
      saveApiKey,
    })
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: null, hostname: null },
      isLoaded: true,
      saveSnowflakeConfig,
    })

    render(<SettingsModal isOpen={true} onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Gemini AI Key'), {
      target: { value: 'new-gemini-key' },
    })
    fireEvent.change(screen.getByLabelText('Snowflake Access Token'), {
      target: { value: 'new-snowflake-token' },
    })
    fireEvent.change(screen.getByLabelText('Snowflake Hostname'), {
      target: { value: 'new-snowflake-host' },
    })

    fireEvent.click(screen.getByText('OK'))

    await waitFor(() => {
      expect(saveApiKey).toHaveBeenCalledWith('new-gemini-key')
      expect(saveSnowflakeConfig).toHaveBeenCalledWith({
        accessToken: 'new-snowflake-token',
        hostname: 'new-snowflake-host',
      })
    })
  })
})
