// widget/src/utils/api.js
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
  // Make sure we use the correct base URL - local for development, production for production
  const baseUrl = config.apiUrl || 'http://localhost:8000';
  
  console.log(`Making API request to: ${baseUrl}${endpoint}`);
  
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
      console.error(`API error: ${response.status} for ${baseUrl}${endpoint}`);
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      } catch (parseError) {
        throw new Error(`API error: ${response.status}`);
      }
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
    
    // For development, provide mock data if the API is not available
    if (process.env.NODE_ENV === 'development') {
      return getMockResponse(endpoint);
    }
    
    throw error;
  }
};

/**
 * Get mock response data for development
 */
function getMockResponse(endpoint) {
  console.log('Using mock response for', endpoint);
  
  if (endpoint.includes('/chatbot/message')) {
    return {
      session_id: 'mock-session-123',
      message: {
        id: 'mock-msg-' + Date.now(),
        content: "This is a mock response. Configure your backend URL correctly to see real responses.",
        created_at: new Date().toISOString()
      },
      knowledge_used: false
    };
  }
  
  if (endpoint.includes('/chatbot/history')) {
    return [];
  }
  
  if (endpoint.includes('/widget/settings')) {
    return {
      primary_color: "#4f46e5",
      chatbot_name: "AI Assistant",
      widget_position: "bottom-right",
      show_typing_indicator: true,
      enable_suggestions: true,
    };
  }
  
  return { success: true };
}

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
  
  return apiFetch('/api/widget/settings', {
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