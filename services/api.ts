/**
 * API Service Layer
 * Centralizes all API calls and abstracts data fetching logic
 * Makes it easy to swap mock data for real API calls
 */

import { API } from '@/constants/app';

// ============================================================================
// BASE API CLIENT
// ============================================================================

interface RequestConfig extends RequestInit {
  timeout?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base API client with timeout, retry logic, and error handling
 */
class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = process.env.API_BASE_URL || '', timeout: number = API.REQUEST_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestConfig = {}
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw error;
    }
  }

  private async retryFetch(
    url: string,
    config: RequestConfig = {},
    retries: number = API.MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, config);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, API.RETRY_DELAY_MS * (attempt + 1))
          );
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, API.RETRY_DELAY_MS * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new ApiError('Max retries exceeded');
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.retryFetch(url, {
      ...config,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `GET ${endpoint} failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.retryFetch(url, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(
        `POST ${endpoint} failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.retryFetch(url, {
      ...config,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(
        `PUT ${endpoint} failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.retryFetch(url, {
      ...config,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `DELETE ${endpoint} failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export { apiClient, ApiClient, ApiError };

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) => apiClient.get<T>(endpoint, config),
  post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => apiClient.post<T>(endpoint, data, config),
  put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => apiClient.put<T>(endpoint, data, config),
  delete: <T>(endpoint: string, config?: RequestConfig) => apiClient.delete<T>(endpoint, config),
};

// ============================================================================
// SOCIAL SYNC API METHODS
// ============================================================================

export interface ContactSyncRequest {
  phoneNumbers: string[]; // Hashed phone numbers
  userId: string;
}

export interface ContactSyncResponse {
  matches: Array<{
    hashedPhone: string;
    userId: string;
    displayName: string;
    avatarUrl: string;
  }>;
  totalMatches: number;
}

export interface InstagramSyncRequest {
  accessToken: string;
  userId: string;
}

export interface InstagramSyncResponse {
  matches: Array<{
    instagramId: string;
    instagramUsername: string;
    userId: string;
    displayName: string;
    avatarUrl: string;
  }>;
  totalMatches: number;
}

/**
 * Sync phone contacts with backend to find matches
 * Backend will hash the phone numbers and compare with user database
 */
export async function syncContacts(request: ContactSyncRequest): Promise<ContactSyncResponse> {
  return apiClient.post<ContactSyncResponse>('/social/sync/contacts', request);
}

/**
 * Sync Instagram following with backend to find matches
 * Backend will fetch following list from Instagram API and match with users
 */
export async function syncInstagram(request: InstagramSyncRequest): Promise<InstagramSyncResponse> {
  return apiClient.post<InstagramSyncResponse>('/social/sync/instagram', request);
}

/**
 * Exchange Instagram authorization code for access token
 */
export async function exchangeInstagramCode(code: string): Promise<{
  accessToken: string;
  userId: string;
  username: string;
}> {
  return apiClient.post('/auth/instagram/token', { code });
}
