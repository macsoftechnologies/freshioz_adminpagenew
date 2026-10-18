export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Standard HTTP client with automatic Bearer token injection and error parsing
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const token = localStorage.getItem('freshioz_auth_token') || localStorage.getItem('freshioz_admin_token');
  const headers = { ...options.headers };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if payload is FormData (browser will set boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('freshioz_auth_expired'));
    }
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || `Request failed with status ${response.status}`;
    const error = new Error(Array.isArray(message) ? message.join(', ') : message);
    error.status = response.status;
    error.data = errorBody;
    if (response.status === 409) {
      error.isConflict = true;
    }
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return await response.json().catch(() => null);
}
