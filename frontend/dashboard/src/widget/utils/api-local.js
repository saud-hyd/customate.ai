// frontend/dashboard/src/widget/utils/api-local.js
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
  // Change this line to use localhost instead of api.customate.ai
  const baseUrl = 'http://localhost:8000'; // Your backend port
  
  console.log(`Making request to: ${baseUrl}${endpoint}`);
  
  // Ensure headers object exists
  if (!options.headers) {
    options.headers = {};
  }
  
  // First try to get token from localStorage
  const token = localStorage.getItem('token');
  
  // Add authentication - prefer token over API key
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
    console.log('Using Bearer token authentication');
  } else {
    // Fall back to API key authentication
    options.headers['X-API-Key'] = config.apiKey || "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50";
    console.log('Using API key authentication');
  }
  
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
    
    // Track API call for analytics (disabled for local testing)
    // trackEvent('api_call', {
    //   endpoint,
    //   status: response.status,
    //   response_time_ms: responseTime
    // });
    
    // Handle non-2xx responses
    if (!response.ok) {
      console.error(`API error: ${response.status} for ${baseUrl}${endpoint}`);
      
      // Return mock data for testing
      return getMockResponse(endpoint);
    }
    
    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    
    // Return mock data for development
    return getMockResponse(endpoint);
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
        content: "This is a mock response since your backend isn't connected. Configure your backend URL correctly to see real responses.",
        created_at: new Date().toISOString()
      },
      knowledge_used: false
    };
  }
  
  if (endpoint.includes('/chatbot/history')) {
    return [];
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