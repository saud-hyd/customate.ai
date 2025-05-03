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
  // Using localhost as the backend URL
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
  
  if (endpoint.includes('/chatbot/message') || endpoint.includes('/widget/message')) {
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
  
  if (endpoint.includes('/chatbot/history') || endpoint.includes('/widget/history')) {
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
  const config = getConfig();
  const baseUrl = 'http://localhost:8000'; // Your backend port
  
  // First try to use the streaming endpoint
  try {
    console.log('Attempting to use streaming endpoint for better responsiveness');
    
    // Create request headers with proper authentication
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication - prefer token over API key
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-API-Key'] = config.apiKey || "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50";
    }
    
    // Create a promise-based wrapper for the streaming connection
    return new Promise((resolve, reject) => {
      // Start a POST request to the streaming endpoint
      fetch(`${baseUrl}/api/widget/message/stream`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      }).then(response => {
        if (!response.ok) {
          // If streaming fails, throw error to trigger fallback
          throw new Error(`Streaming endpoint returned ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sessionId = data.session_id;
        let messageId = null;
        let finalContent = '';
        let knowledge_used = false;
        
        // Function to read the stream
        function readStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              console.log('Stream completed');
              
              // When stream completes, resolve with the accumulated response
              resolve({
                session_id: sessionId,
                message: {
                  id: messageId || 'msg-' + Date.now(),
                  content: finalContent,
                  created_at: new Date().toISOString()
                },
                knowledge_used: knowledge_used
              });
              
              return;
            }
            
            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete events in buffer
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            // Process each complete SSE event
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                const eventData = line.substring(6);
                if (eventData && eventData !== '[DONE]') {
                  try {
                    const data = JSON.parse(eventData);
                    
                    // Handle different message types
                    if (data.type === 'info') {
                      sessionId = data.session_id || sessionId;
                      knowledge_used = data.knowledge_used || false;
                    } else if (data.type === 'chunk') {
                      if (!messageId) messageId = data.message_id;
                      finalContent += data.content;
                    } else if (data.type === 'complete') {
                      finalContent = data.content; // Replace with complete content
                    } else if (data.type === 'done') {
                      if (data.message && data.message.content) {
                        finalContent = data.message.content;
                      }
                      if (data.message && data.message.id) {
                        messageId = data.message.id;
                      }
                      if (data.session_id) {
                        sessionId = data.session_id;
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });
            
            // Continue reading the stream
            readStream();
          }).catch(err => {
            console.error('Error reading stream:', err);
            reject(err);
          });
        }
        
        // Start reading the stream
        readStream();
      }).catch(err => {
        console.error('Error with streaming endpoint:', err);
        
        // Fall back to regular endpoint
        console.log('Falling back to regular endpoint');
        apiFetch('/api/widget/message', {
          method: 'POST',
          body: JSON.stringify(data)
        }).then(resolve).catch(reject);
      });
    });
  } catch (error) {
    console.error('Error using streaming endpoint:', error);
    
    // Fall back to regular endpoint
    console.log('Falling back to regular endpoint');
    return apiFetch('/api/widget/message', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

/**
 * Get chat history for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise} - API response with message history
 */
export const getHistory = async (sessionId) => {
  if (!sessionId) return [];
  
  // Try widget-specific endpoint first
  try {
    return await apiFetch(`/api/widget/history/${sessionId}`);
  } catch (error) {
    console.log('Falling back to chatbot history endpoint');
    return apiFetch(`/api/chatbot/history/${sessionId}`);
  }
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