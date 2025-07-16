import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '@/app/page'
import { getGeminiApiKey, setGeminiApiKey } from '@/utils/storage'
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey'
import SettingsModal from '@/components/SettingsModal'

jest.mock('@/utils/storage', () => ({
  getGeminiApiKey: jest.fn(),
  setGeminiApiKey: jest.fn(),
}))

jest.mock('@/hooks/useGeminiApiKey', () => ({
  useGeminiApiKey: jest.fn(),
}))

jest.mock('react-markdown', () => (props: any) => {
  return <>{props.children}</>
})

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens the settings modal automatically if no API key is set', async () => {
    ;(useGeminiApiKey as jest.Mock).mockReturnValue({
      apiKey: null,
      isLoaded: true,
    })
    render(<Home />)
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('does not open the settings modal automatically if an API key is set', async () => {
    ;(useGeminiApiKey as jest.Mock).mockReturnValue({
      apiKey: 'test-key',
      isLoaded: true,
    })
    render(<Home />)
    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  it('opens the settings modal when the settings button is clicked', async () => {
    ;(useGeminiApiKey as jest.Mock).mockReturnValue({
      apiKey: 'test-key',
      isLoaded: true,
    })
    render(<Home />)
    fireEvent.click(screen.getByLabelText('Settings'))
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('saves the API key when the OK button is clicked', async () => {
    const saveApiKey = jest.fn()
    ;(useGeminiApiKey as jest.Mock).mockReturnValue({
      apiKey: null,
      isLoaded: true,
      saveApiKey,
    })
    render(<SettingsModal isOpen={true} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Gemini AI Key'), {
      target: { value: 'new-key' },
    })
    fireEvent.click(screen.getByText('OK'))
    await waitFor(() => {
      expect(saveApiKey).toHaveBeenCalledWith('new-key')
    })
  })
})
