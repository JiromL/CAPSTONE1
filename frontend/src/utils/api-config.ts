/**
 * API Configuration and utilities
 * Uses NEXT_PUBLIC_API_BASE environment variable 
 */

export const getApiBase = (): string => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
  }
  // Client-side
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
};

/**
 * Get full API URL from endpoint
 */
export const getApiUrl = (endpoint: string): string => {
  const base = getApiBase();
  // Remove leading slash if present to avoid double slashes
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

/**
 * Fetch with error handling
 */
export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const url = getApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
