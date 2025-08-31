import { storage } from '../utils/storage';

class SnowflakeError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'SnowflakeError';
  }
}

export interface SnowflakeQueryRequest {
  statement: string;
  timeout?: number;
  database?: string;
  schema?: string;
  warehouse?: string;
  role?: string;
}

export interface SnowflakeQueryResponse {
  statementHandle: string;
  data?: unknown[][];
  resultSetMetaData?: {
    numRows?: number;
    format?: string;
    rowType?: Array<{
      name: string;
      type: string;
      length?: number;
      precision?: number;
      scale?: number;
      nullable?: boolean;
    }>;
  };
  message?: string;
  code?: string;
  sqlState?: string;
}

export class SnowflakeService {
  async executeQuery(
    request: SnowflakeQueryRequest,
  ): Promise<SnowflakeQueryResponse> {
    const [accessToken, hostname] = await Promise.all([
      storage.getSnowflakeAccessToken(),
      storage.getSnowflakeHostname(),
    ]);

    if (!accessToken) {
      throw new SnowflakeError(
        'Snowflake access token is required. Please configure it in the settings.',
      );
    }

    if (!hostname) {
      throw new SnowflakeError(
        'Snowflake hostname is required. Please configure it in the settings.',
      );
    }

    const url = `https://${hostname}/api/v2/statements`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          statement: request.statement,
          timeout: request.timeout || 60,
          database: request.database,
          schema: request.schema,
          warehouse: request.warehouse,
          role: request.role,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Snowflake API request failed: ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = `Snowflake API error: ${errorData.message}`;
          }
        } catch {
          // Use the default error message if we can't parse the response
        }

        throw new SnowflakeError(errorMessage, response.status);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof SnowflakeError) {
        throw error;
      }
      throw new SnowflakeError(
        `Failed to communicate with Snowflake API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getStatementStatus(
    statementHandle: string,
  ): Promise<SnowflakeQueryResponse> {
    const [accessToken, hostname] = await Promise.all([
      storage.getSnowflakeAccessToken(),
      storage.getSnowflakeHostname(),
    ]);

    if (!accessToken || !hostname) {
      throw new SnowflakeError('Snowflake configuration is missing');
    }

    const url = `https://${hostname}/api/v2/statements/${statementHandle}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new SnowflakeError(
          `Failed to get statement status: ${response.statusText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SnowflakeError) {
        throw error;
      }
      throw new SnowflakeError(
        `Failed to get statement status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async validateConfig(
    accessToken: string,
    hostname: string,
  ): Promise<boolean> {
    try {
      const url = `https://${hostname}/api/v2/statements`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          statement: 'SELECT 1',
          timeout: 10,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const snowflakeService = new SnowflakeService();
