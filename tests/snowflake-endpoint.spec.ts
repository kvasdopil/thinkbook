import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Snowflake API endpoint', () => {
  test('returns 400 when token is missing', async ({ request }) => {
    const res = await request.post(`${base}/api/snowflake?mock=1`, {
      data: { sql: 'select 1' },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'A valid Snowflake access token is required' });
  });

  test('returns 400 when missing both sql and handle', async ({ request }) => {
    const res = await request.post(`${base}/api/snowflake?mock=1`, {
      headers: { 'x-snowflake-access-token': 'fake' },
      data: {},
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Request must contain either "sql" or "handle"' });
  });

  test('executes SQL and returns mocked data', async ({ request }) => {
    const res = await request.post(`${base}/api/snowflake?mock=1`, {
      headers: { 'x-snowflake-access-token': 'fake' },
      data: { sql: 'select 1' },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.statementHandle).toBeTruthy();
    expect(json.data?.rows?.length).toBeGreaterThan(0);
  });

  test('fetches a partition for a handle', async ({ request }) => {
    const res = await request.post(`${base}/api/snowflake?mock=1`, {
      headers: { 'x-snowflake-access-token': 'fake' },
      data: { handle: 'mock-handle-1', partition: 2 },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.statementHandle).toBe('mock-handle-1');
    expect(json.data?.partition).toBe(2);
  });
});


