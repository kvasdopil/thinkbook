import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * E2E Test #9 – Basic chat send and streaming response
 *
 * Uses network interception to simulate a streaming AI response split into two
 * chunks "Part 1" and "Part 2".
 */

test.describe('Chat – Send & Stream', () => {
  test('should display user message immediately and stream assistant chunks', async ({
    page,
  }: {
    page: Page
  }) => {
    // Intercept chat API
    await page.route('**/api/chat', async (route: Route) => {
      // Simulate streaming with two chunks
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Part 1'))
          controller.enqueue(new TextEncoder().encode('Part 2'))
          controller.close()
        },
      })
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
        body: stream,
      })
    })

    await page.goto('/')

    // Type message
    await page.getByRole('textbox', { name: /ask a question/i }).fill('Hello?')
    await page.keyboard.press('Enter')

    // User bubble appears instantly
    await expect(page.getByText('Hello?')).toBeVisible()

    // Assistant chunks should stream into single bubble
    await expect(page.getByText('Part 1')).toBeVisible()
    await expect(page.getByText('Part 2')).toBeVisible()
  })
})
