/**
 * Centralized API client for backend communication.
 *
 * All API calls go through this module for consistent
 * error handling, request formatting, and response parsing.
 */

const API_BASE = '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an API request with standard error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Response wasn't JSON
      }
      throw new ApiError(errorMessage, response.status);
    }

    // Handle empty responses (like 204 No Content)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error', 0);
  }
}

// --- Session API ---

export const sessionApi = {
  /**
   * Submit a new typing session
   */
  submit: (data) =>
    request('/submit_session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get a session by ID with all keystrokes
   */
  get: (sessionId) => request(`/session/${sessionId}`),

  /**
   * List all sessions (without keystrokes)
   */
  list: (limit = 1000) => request(`/sessions?limit=${limit}`),

  /**
   * Delete a session
   */
  delete: (sessionId) =>
    request(`/session/${sessionId}`, { method: 'DELETE' }),

  /**
   * Update session label
   */
  updateLabel: (sessionId, label) =>
    request(`/session/${sessionId}/label`, {
      method: 'PUT',
      body: JSON.stringify({ label }),
    }),

  /**
   * Update finger annotations for a session
   */
  updateFingers: (sessionId, annotations) =>
    request('/update_fingers', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        annotations,
      }),
    }),

  /**
   * Compute features for a session
   */
  computeFeatures: (sessionId) =>
    request(`/compute_features/${sessionId}`, { method: 'POST' }),
};

// --- Stats API ---

export const statsApi = {
  /**
   * Get database statistics
   */
  get: () => request('/stats'),
};

// --- Patterns API ---

export const patternsApi = {
  /**
   * Get pattern analysis (digraphs, trigraphs, transitions)
   */
  analyze: (mode = null) =>
    request(mode ? `/patterns?mode=${mode}` : '/patterns'),

  /**
   * Get details for a specific digraph
   */
  getDigraph: (pattern) =>
    request(`/digraph/${encodeURIComponent(pattern)}`),
};

// --- Keystrokes API ---

export const keystrokesApi = {
  /**
   * Get all keystrokes with session info
   */
  getData: (limit = 1000, offset = 0) =>
    request(`/keystrokes/data?limit=${limit}&offset=${offset}`),

  /**
   * Delete a keystroke
   */
  delete: (keystrokeId) =>
    request(`/keystroke/${keystrokeId}`, { method: 'DELETE' }),
};

// --- Text Generation API ---

export const generateApi = {
  /**
   * Generate typing text for a given mode
   */
  text: (mode) => request(`/generate/${mode}`),
};

// --- Database API ---

export const databaseApi = {
  /**
   * Download the database file
   */
  download: () => `${API_BASE}/database/download`,

  /**
   * Upload a database file
   */
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/database/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(error.detail, response.status);
    }

    return response.json();
  },
};

// --- Health API ---

export const healthApi = {
  /**
   * Check API health
   */
  check: () => request('/health'),
};

// Default export with all APIs
export default {
  session: sessionApi,
  stats: statsApi,
  patterns: patternsApi,
  keystrokes: keystrokesApi,
  generate: generateApi,
  database: databaseApi,
  health: healthApi,
};
