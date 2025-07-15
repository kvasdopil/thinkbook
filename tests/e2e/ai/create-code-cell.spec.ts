import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * E2E Test #12 – AI createCodeCell tool
 */

test.describe('AI – createCodeCell Tool', () => {
  test('should insert a new collapsed cell after tool invocation', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.route('**/api/chat', async (route: Route) => {
      const mock = JSON.stringify({
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'createCodeCell',
              toolCallId: 'call-999',
              args: { text: '# New example\nprint(42)' },
            },
          },
          { type: 'text', text: 'Created a new example cell for you.' },
        ],
      })
      await route.fulfill({ status: 200, body: mock })
    })

    await page.goto('/')

    // Trigger AI
    await page
      .getByRole('textbox', { name: /ask a question/i })
      .fill('create cell')
    await page.keyboard.press('Enter')

    // Tool-call bubble should appear
    await expect(page.getByText(/createcodecell/i)).toBeVisible()

    // A new collapsed cell with description "New example" should now be present
    await expect(page.getByText(/new example/i)).toBeVisible()

    // The cell should be collapsed (editor hidden)
    const cell = page.locator('div[role="group"]').last()
    await expect(cell.locator('.monaco-editor')).toBeHidden()
  })
})
