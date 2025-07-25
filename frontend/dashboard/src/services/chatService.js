// frontend/dashboard/src/services/enhancedChatService.js
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../utils/environment';


class ChatService {
  constructor() {
    // Get API key from local storage on initialization
    this.apiKey = localStorage.getItem('apiKey');
    this.token = localStorage.getItem('token');
  }

  /**
   * Get proper authentication headers based on available credentials
   * @returns {Object} Authentication headers
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      // Use Bearer token if available (preferred)
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.apiKey) {
      // Fall back to API key if token isn't available
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Send a message and get a streaming response with proper authentication
   * @param {string} message - The user's message
   * @param {string} sessionId - Optional session ID for continuing a conversation
   * @param {function} onChunk - Callback for each response chunk
   * @param {function} onDone - Callback when streaming is complete
   * @param {function} onError - Callback for errors
   * @param {Object} llmSettings - Optional LLM provider and model settings
   * @returns {function} Function to cancel the stream
   */
  // Add this method to the ChatService class to fix the error
  async getConversations(limit = 100, skip = 0) {
    try {
      const headers = this.getAuthHeaders();
      
      const response = await axios.get(`${API_URL}/chatbot/sessions`, {
        headers,
        params: { limit, skip }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // Add this function to delete a conversation
  async deleteConversation(sessionId) {
    try {
      const headers = this.getAuthHeaders();
      
      await axios.delete(`${API_URL}/chatbot/sessions/${sessionId}`, {
        headers
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Add this function to get messages for a specific conversation
  async getMessages(sessionId, limit = 50) {
    try {
      const headers = this.getAuthHeaders();
      
      const response = await axios.get(`${API_URL}/chatbot/history/${sessionId}`, {
        headers,
        params: { limit }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }
  
  sendMessageStreaming(message, sessionId = null, onChunk, onDone, onError, llmSettings = null) {
    // Create request data
    const requestData = {
      message,
      session_id: sessionId,
    };
    
    // Add LLM settings if provided
    if (llmSettings) {
      requestData.llm_settings = llmSettings;
    }
    
    // Get authentication headers - use BOTH token and API key if available
    const headers = this.getAuthHeaders();
    
    // Debug headers
    console.log('Sending streaming request with headers:', 
      JSON.stringify({
        ...headers,
        Authorization: headers.Authorization ? '(Bearer token present)' : '(no Bearer token)'
      }));
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    const signal = controller.signal;
    
    const endpoint = `${API_URL}/chatbot/message/stream`;

    
    // Start the fetch request
    fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData),
      signal: signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Process stream response handling (same as before)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let messageId = null;
      let fullMessage = '';
      
      function processStream() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            // Process remaining buffer
            if (buffer) {
              try {
                const lines = buffer.split('\n\n');
                lines.forEach(line => {
                  if (line.startsWith('data: ')) {
                    const eventData = line.substring(6);
                    if (eventData && eventData !== '[DONE]') {
                      const data = JSON.parse(eventData);
                      
                      if (data.type === 'info') {
                        sessionId = data.session_id;
                      } else if (data.type === 'chunk') {
                        if (!messageId) messageId = data.message_id;
                        fullMessage += data.content;
                        onChunk(data.content, messageId);
                      } else if (data.type === 'complete') {
                        fullMessage = data.content;
                        onChunk(data.content, messageId, true);
                      } else if (data.type === 'done') {
                        onDone({
                          message: data.message,
                          session_id: sessionId,
                        });
                      }
                    }
                  }
                });
              } catch (e) {
                console.error('Error parsing final chunk:', e);
              }
            }
            
            // Ensure onDone is called even if no 'done' message was received
            if (typeof onDone === 'function') {
              onDone({
                message: { content: fullMessage, id: messageId },
                session_id: sessionId,
              });
            }
            return;
          }
          
          // Process new chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete events
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const eventData = line.substring(6);
              if (eventData && eventData !== '[DONE]') {
                try {
                  const data = JSON.parse(eventData);
                  
                  if (data.type === 'info') {
                    sessionId = data.session_id;
                  } else if (data.type === 'chunk') {
                    if (!messageId) messageId = data.message_id;
                    fullMessage += data.content;
                    onChunk(data.content, messageId);
                  } else if (data.type === 'complete') {
                    fullMessage = data.content;
                    onChunk(data.content, messageId, true);
                  } else if (data.type === 'done') {
                    onDone({
                      message: data.message,
                      session_id: sessionId,
                    });
                  } else if (data.type === 'error') {
                    onError(new Error(data.error || 'Unknown error'));
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e);
                }
              }
            }
          });
          
          return processStream();
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Stream reading error:', err);
            onError(err);
          }
        });
      }
      
      return processStream();
    })
    .catch(err => {
      console.error('Fetch error:', err);
      onError(err);
    });
    
    return () => {
      controller.abort();
    };
  }
}

export default new ChatService();