// Snowflake SQL proxy endpoint

export const runtime = 'nodejs';

interface SnowflakeResult<T = unknown> {
  statementHandle?: string;
  sqlState?: string;
  code?: string | number;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

function getBaseUrl(): string {
  const base = process.env.SNOWFLAKE_BASE_URL;
  if (!base) {
    throw new Error('SNOWFLAKE_BASE_URL is not defined');
  }
  return base.replace(/\/$/, '');
}

function getAuthHeader(req: Request): string | null {
  const token = req.headers.get('x-snowflake-access-token');
  if (!token) return null;
  return `Bearer ${token}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const mock = url.searchParams.get('mock') === '1';

    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return Response.json(
        { error: 'A valid Snowflake access token is required' },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      sql?: string;
      handle?: string;
      partition?: number | string | null;
    };

    const hasSql = typeof body.sql === 'string' && body.sql.trim().length > 0;
    const hasHandle = typeof body.handle === 'string' && body.handle.trim().length > 0;

    if (!hasSql && !hasHandle) {
      return Response.json(
        { error: 'Request must contain either "sql" or "handle"' },
        { status: 400 },
      );
    }

    // Mocked responses for testing without real Snowflake
    if (mock) {
      if (hasSql) {
        const mocked: SnowflakeResult = {
          statementHandle: 'mock-handle-1',
          data: {
            rowType: [
              { name: 'ID', type: 'FIXED' },
              { name: 'NAME', type: 'TEXT' },
            ],
            rows: [
              [1, 'Alice'],
              [2, 'Bob'],
            ],
          },
        };
        return Response.json(mocked);
      }

      const partitionNumber = Number(body.partition ?? 0) || 0;
      const mockedPartition: SnowflakeResult = {
        statementHandle: body.handle,
        data: {
          partition: partitionNumber,
          rows: [['p', partitionNumber]],
        },
      };
      return Response.json(mockedPartition);
    }

    const baseUrl = getBaseUrl();
    const headers: Record<string, string> = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const timeoutMs = 30_000;

    if (hasSql) {
      const endpoint = `${baseUrl}/api/statements`;
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ statement: body.sql, timeout: 30 }),
        },
        timeoutMs,
      );

      if (!res.ok) {
        const text = await res.text();
        console.error('Snowflake error:', res.status, text);
        return new Response(text || 'Upstream error', { status: 500 });
      }

      const json = (await res.json()) as SnowflakeResult;
      return Response.json(json);
    }

    const partitionNumber = Number(body.partition ?? 0) || 0;
    const endpoint = `${baseUrl}/api/statements/${encodeURIComponent(
      body.handle as string,
    )}?partition=${partitionNumber}`;

    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'GET',
        headers,
      },
      timeoutMs,
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Snowflake error:', res.status, text);
      return new Response(text || 'Upstream error', { status: 500 });
    }

    const json = (await res.json()) as SnowflakeResult;
    return Response.json(json);
  } catch (err) {
    const message = (err as Error)?.message ?? 'Unknown error';
    console.error(err);
    return Response.json({ error: message }, { status: 500 });
  }
}


