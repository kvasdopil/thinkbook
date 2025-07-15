import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * E2E Test #10 – Markdown rendering in assistant messages
 */

test.describe('Chat – Markdown Render', () => {
  test('should render headings, lists, code blocks and scrollable tables', async ({
    page,
  }: {
    page: Page
  }) => {
    // Stub AI to return markdown-rich content
    await page.route('**/api/chat', async (route: Route) => {
      const markdown = `# Heading\n\n- Item 1\n- Item 2\n\n\`\`\`python\nprint('code')\n\`\`\`\n\n| Col A | Col B |\n|-------|-------|\n| 1     | 2     |`
      await route.fulfill({ status: 200, body: markdown })
    })

    await page.goto('/')

    // Send dummy question
    await page.getByRole('textbox', { name: /ask a question/i }).fill('md?')
    await page.keyboard.press('Enter')

    // Headings, bullet list and code block should be visible
    await expect(
      page.getByRole('heading', { level: 1, name: /heading/i })
    ).toBeVisible()
    await expect(page.getByText('Item 1')).toBeVisible()
    await expect(page.getByText('print(')).toBeVisible()

    // Table should be horizontally scrollable – check css overflow property
    const tableWrapper = page.locator('div:has(table)').first()
    await expect(tableWrapper).toHaveCSS('overflow-x', 'auto')
  })
})
