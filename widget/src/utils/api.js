import { getConfig } from '../config';
import { trackEvent } from './analytics';
import { getSessionId } from './storage';

/**
 * Base fetch wrapper with error handling and authentication
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
const apiFetch = async (endpoint, options = {}) => {
  const config = getConfig();
  const baseUrl = config.apiUrl || 'https://api.customate.ai';
  
  // Ensure headers object exists
  if (!options.headers) {
    options.headers = {};
  }
  
  // Add API key authentication
  options.headers['X-API-Key'] = config.apiKey;
  
  // Add content type if not specified and method is not GET
  if (!options.headers['Content-Type'] && options.method && options.method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
  }
  
  // Add user identification if available
  if (config.userId) {
    options.headers['X-User-ID'] = config.userId;
  }
  
  // Measure response time for analytics
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Track API call for analytics
    trackEvent('api_call', {
      endpoint,
      status: response.status,
      response_time_ms: responseTime
    });
    
    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'An unknown error occurred'
      }));
      
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    // Track error for analytics
    trackEvent('api_error', {
      endpoint,
      error: error.message
    });
    
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Send a message to the chatbot API
 * @param {Object} data - Message data including text and session ID
 * @returns {Promise} - API response
 */
export const sendMessage = async (data) => {
  return apiFetch('/api/chatbot/message', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Get chat history for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise} - API response with message history
 */
export const getHistory = async (sessionId) => {
  if (!sessionId) return [];
  
  return apiFetch(`/api/chatbot/history/${sessionId}`);
};

/**
 * Get widget configuration from the backend
 * @returns {Promise} - API response with widget configuration
 */
export const getWidgetConfig = async () => {
  const config = getConfig();
  
  return apiFetch('/api/widget/config', {
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey
    }
  });
};

/**
 * Send user feedback about a message
 * @param {string} messageId - ID of the message to provide feedback on
 * @param {string} feedback - Feedback type ('helpful', 'not_helpful', etc.)
 * @param {string} comment - Optional comment with the feedback
 * @returns {Promise} - API response
 */
export const sendFeedback = async (messageId, feedback, comment = '') => {
  return apiFetch('/api/chatbot/feedback', {
    method: 'POST',
    body: JSON.stringify({
      message_id: messageId,
      feedback_type: feedback,
      comment,
      session_id: getSessionId()
    })
  });
};

/**
 * Register a widget impression (when widget is first seen by user)
 * @returns {Promise} - API response
 */
export const registerImpression = async () => {
  const config = getConfig();
  
  return apiFetch('/api/analytics/impression', {
    method: 'POST',
    body: JSON.stringify({
      source: window.location.href,
      referrer: document.referrer,
      user_id: config.userId || null
    })
  });
};