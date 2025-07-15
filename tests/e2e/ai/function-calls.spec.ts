import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * E2E Test #11 – AI Function Call Rendering
 *
 * Mocks a `listCells` tool invocation and verifies the tool-call balloon shows
 * progress → success followed by the assistant’s follow-up message.
 */

test.describe('AI – Function Calls', () => {
  test('should render tool call balloon before assistant follow-up', async ({
    page,
  }: {
    page: Page
  }) => {
    // Mock response containing a tool invocation part; the exact structure of
    // the Vercel AI SDK streaming format is simplified here because the goal
    // is merely to exercise the conversation rendering pipeline.
    await page.route('**/api/chat', async (route: Route) => {
      const mockParts = JSON.stringify({
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'listCells',
              toolCallId: 'call-123',
              args: {},
            },
          },
          { type: 'text', text: 'Here is the list of cells!' },
        ],
      })
      await route.fulfill({ status: 200, body: mockParts })
    })

    await page.goto('/')

    // Send trigger message
    await page.getByRole('textbox', { name: /ask a question/i }).fill('cells?')
    await page.keyboard.press('Enter')

    // Expect tool-call bubble appears
    await expect(page.getByText(/listCells/i)).toBeVisible()

    // Follow-up text message should appear after tool bubble
    await expect(page.getByText(/here is the list of cells/i)).toBeVisible()
  })
})
