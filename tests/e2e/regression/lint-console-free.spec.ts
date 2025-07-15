import { test, expect } from '@playwright/test'
import type { Page, ConsoleMessage } from '@playwright/test'

/**
 * E2E Test #15 – Console should stay clean during representative workflow
 */

test.describe('Regression – Console free of errors', () => {
  test('should emit no error or warning console events', async ({
    page,
  }: {
    page: Page
  }) => {
    const errors: ConsoleMessage[] = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errors.push(msg)
      }
    })

    await page.goto('/')

    // Minimal workflow: add cell, run, chat
    await page.getByRole('button', { name: /add new cell/i }).click()
    const cell = page.locator('div[role="group"]').last()
    await cell.getByRole('button', { name: /show code editor/i }).click()
    await cell.locator('.monaco-editor').click()
    await page.keyboard.type('print("regression")')
    await cell.getByRole('button', { name: /run code execution/i }).click()
    await expect(cell.getByText('regression')).toBeVisible()

    await page.getByRole('textbox', { name: /ask a question/i }).fill('hi')
    await page.keyboard.press('Enter')

    // Wait for potential errors to surface
    await page.waitForTimeout(500)

    expect(errors.length).toBe(0)
  })
})
