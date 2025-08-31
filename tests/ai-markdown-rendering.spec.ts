import { test, expect } from '@playwright/test';

test.describe('AI Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI output
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) =>
      console.error('PAGE ERROR:', error.message),
    );

    await page.goto('/');

    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('renders markdown headings correctly', async ({ page }) => {
    // Mock AI response with markdown headings
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: '# Main Title\n## Subtitle\n### Small Heading\n\nThis is content under headings.',
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Test headings',
    );
    await page.click('button:has-text("Send")');

    // Wait for response and check headings are rendered
    await expect(page.locator('h1:has-text("Main Title")')).toBeVisible();
    await expect(page.locator('h2:has-text("Subtitle")')).toBeVisible();
    await expect(page.locator('h3:has-text("Small Heading")')).toBeVisible();
    await expect(
      page.locator('text=This is content under headings.'),
    ).toBeVisible();
  });

  test('renders markdown lists correctly', async ({ page }) => {
    // Mock AI response with markdown lists
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: '## Todo List\n\n- First item\n- Second item\n- Third item\n\n### Ordered List\n\n1. Number one\n2. Number two\n3. Number three',
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Test lists',
    );
    await page.click('button:has-text("Send")');

    // Wait for response and check lists are rendered
    await expect(page.locator('ul')).toBeVisible();
    await expect(page.locator('ol')).toBeVisible();
    await expect(page.locator('li:has-text("First item")')).toBeVisible();
    await expect(page.locator('li:has-text("Number one")')).toBeVisible();
  });

  test('renders markdown tables with horizontal scrolling', async ({
    page,
  }) => {
    // Mock AI response with markdown table
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: '## Data Table\n\n| Name | Age | City | Country | Occupation |\n|------|-----|------|---------|------------|\n| Alice | 30 | New York | USA | Engineer |\n| Bob | 25 | London | UK | Designer |\n| Charlie | 35 | Tokyo | Japan | Manager |',
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Test table',
    );
    await page.click('button:has-text("Send")');

    // Wait for response and check table is rendered
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('.overflow-x-auto')).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Age")')).toBeVisible();

    // Check table data
    await expect(page.locator('td:has-text("Alice")')).toBeVisible();
    await expect(page.locator('td:has-text("Engineer")')).toBeVisible();
  });

  test('renders inline code and code blocks correctly', async ({ page }) => {
    // Mock AI response with code
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'Here is some `inline code` example.\n\n```javascript\nconst greeting = "Hello, World!";\nconsole.log(greeting);\nfunction sayHello() {\n  return greeting;\n}\n```\n\nThe `console.log()` function prints to console.',
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Test code',
    );
    await page.click('button:has-text("Send")');

    // Wait for response and check code is rendered
    await expect(page.locator('code:has-text("inline code")')).toBeVisible();
    await expect(page.locator('code:has-text("console.log()")')).toBeVisible();

    // Check code block
    await expect(page.locator('code.block')).toBeVisible();
    await expect(page.locator('code:has-text("const greeting")')).toBeVisible();

    // Verify code block styling
    const codeElement = page.locator('code.block').first();
    await expect(codeElement).toHaveClass(/bg-gray-900/);
    await expect(codeElement).toHaveClass(/overflow-x-auto/);
  });

  test('renders markdown without background or borders on container', async ({
    page,
  }) => {
    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: '# Test Response\n\nThis is a test response to verify styling.',
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Test styling',
    );
    await page.click('button:has-text("Send")');

    // Wait for response
    await expect(page.locator('h1:has-text("Test Response")')).toBeVisible();

    // Check that the prose container has correct classes
    const proseContainer = page.locator('.prose').first();
    await expect(proseContainer).toBeVisible();

    // Verify it has full width and proper prose classes
    await expect(proseContainer).toHaveClass(/w-full/);
    await expect(proseContainer).toHaveClass(/prose-gray/);
    await expect(proseContainer).toHaveClass(/max-w-none/);
  });

  test('handles complex markdown with mixed elements', async ({ page }) => {
    // Mock AI response with complex markdown
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: "# Analysis Results\n\n## Summary\n\nHere are the key findings:\n\n- **Total records**: 1,234\n- **Average value**: $45.67\n- **Status**: `COMPLETE`\n\n### Code Example\n\n```sql\nSELECT COUNT(*), AVG(value)\nFROM transactions \nWHERE status = 'COMPLETE';\n```\n\n### Data Table\n\n| Metric | Value | Change |\n|--------|-------|--------|\n| Revenue | $12,345 | +5.2% |\n| Users | 890 | +12.1% |\n\n> **Note**: All values are approximate.",
        });
      } else {
        await route.continue();
      }
    });

    // Send a test message
    await page.fill(
      'textarea[placeholder="Ask the AI assistant..."]',
      'Complex markdown test',
    );
    await page.click('button:has-text("Send")');

    // Check all elements are rendered correctly
    await expect(page.locator('h1:has-text("Analysis Results")')).toBeVisible();
    await expect(page.locator('h2:has-text("Summary")')).toBeVisible();
    await expect(page.locator('h3:has-text("Code Example")')).toBeVisible();

    // Check list with inline code and bold text
    await expect(
      page.locator('strong:has-text("Total records")'),
    ).toBeVisible();
    await expect(page.locator('code:has-text("COMPLETE")')).toBeVisible();

    // Check SQL code block
    await expect(page.locator('code:has-text("SELECT COUNT")')).toBeVisible();

    // Check table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Metric")')).toBeVisible();
    await expect(page.locator('td:has-text("Revenue")')).toBeVisible();

    // Check blockquote
    await expect(page.locator('blockquote')).toBeVisible();
    await expect(
      page.locator('blockquote strong:has-text("Note")'),
    ).toBeVisible();
  });
});
