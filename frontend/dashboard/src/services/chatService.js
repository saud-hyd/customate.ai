// frontend/dashboard/src/services/chatService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ChatService {
  constructor() {
    this.apiKey = localStorage.getItem('apiKey');
  }

  /**
   * Set the API key for authentication
   * @param {string} apiKey - The API key to use for API calls
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('apiKey', apiKey);
  }

  /**
   * Get the headers for API requests
   * @returns {Object} Headers with authorization
   */
  getHeaders() {
    return {
      'X-API-Key': this.apiKey || localStorage.getItem('apiKey'),
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get conversation sessions list (newest first)
   * @param {number} limit - Maximum number of conversations to retrieve
   * @param {number} skip - Number of conversations to skip (for pagination)
   * @returns {Promise<Array>} List of conversation sessions
   */
  async getConversations(limit = 100, skip = 0) {
    try {
      const response = await axios.get(
        `${API_URL}/chatbot/sessions`,
        {
          headers: this.getHeaders(),
          params: { limit, skip }
        }
      );
      
      // Sort conversations by created_at or updated_at in descending order (newest first)
      const sortedData = response.data.sort((a, b) => {
        // Preferring updated_at for sorting if available, fallback to created_at
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA; // Descending order (newest first)
      });
      
      return sortedData;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   * @param {Object} data - Conversation data (e.g., title)
   * @returns {Promise<Object>} Created conversation session
   */
  async createConversation(data) {
    try {
      const response = await axios.post(
        `${API_URL}/chatbot/sessions`,
        data,
        {
          headers: this.getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<void>} Deletion result
   */
  async deleteConversation(sessionId) {
    try {
      await axios.delete(
        `${API_URL}/chatbot/sessions/${sessionId}`,
        {
          headers: this.getHeaders()
        }
      );
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message to the chatbot and get a response
   * @param {string} message - The user's message
   * @param {string} sessionId - Optional session ID for continuing a conversation
   * @returns {Promise<Object>} Response from the chatbot
   */
  async sendMessage(message, sessionId = null) {
    try {
      const response = await axios.post(
        `${API_URL}/chatbot/message`,
        {
          message,
          session_id: sessionId,
        },
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send a message and get a streaming response
   * @param {string} message - The user's message
   * @param {string} sessionId - Optional session ID for continuing a conversation
   * @param {function} onChunk - Callback for each response chunk
   * @param {function} onDone - Callback when streaming is complete
   * @param {function} onError - Callback for errors
   * @returns {function} Function to cancel the stream
   */
  sendMessageStreaming(message, sessionId = null, onChunk, onDone, onError) {
    // Ensure error callback exists
    const handleError = typeof onError === 'function' ? onError : (err) => {
      console.error('Streaming error:', err);
    };

    // Create request data
    const requestData = {
      message,
      session_id: sessionId,
    };
    
    // Use fetch with ReadableStream API
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Get headers (include API key)
    const headers = this.getHeaders();
    
    // Start the fetch request
    fetch(`${API_URL}/chatbot/message/stream`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData),
      signal: signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Get the readable stream from the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let messageId = null;
      let fullMessage = '';
      
      // Process the stream
      function processStream() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            // Process any remaining data in buffer
            if (buffer) {
              try {
                // Handle any remaining event data
                const lines = buffer.split('\n\n');
                lines.forEach(line => {
                  if (line.startsWith('data: ')) {
                    const eventData = line.substring(6);
                    if (eventData && eventData !== '[DONE]') {
                      const data = JSON.parse(eventData);
                      
                      // Handle different message types
                      if (data.type === 'info') {
                        sessionId = data.session_id;
                      } else if (data.type === 'chunk') {
                        if (!messageId) messageId = data.message_id;
                        fullMessage = data.content; // For cumulative content from backend
                        if (typeof onChunk === 'function') {
                          onChunk(data.content, messageId);
                        }
                      } else if (data.type === 'complete') {
                        fullMessage = data.content;
                        if (typeof onChunk === 'function') {
                          onChunk(data.content, messageId, true);
                        }
                      } else if (data.type === 'done') {
                        if (typeof onDone === 'function') {
                          onDone({
                            message: data.message,
                            session_id: sessionId,
                          });
                        }
                      }
                    }
                  }
                });
              } catch (e) {
                console.error('Error parsing final SSE chunk:', e);
              }
            }
            
            // Ensure onDone gets called even if no done message received
            if (typeof onDone === 'function') {
              onDone({
                message: { content: fullMessage, id: messageId },
                session_id: sessionId,
              });
            }
            return;
          }
          
          // Decode the incoming chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete events in buffer
          const lines = buffer.split('\n\n');
          // Keep the last (potentially incomplete) line in the buffer
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
                    sessionId = data.session_id;
                  } else if (data.type === 'chunk') {
                    if (!messageId) messageId = data.message_id;
                    fullMessage = data.content; // For cumulative content
                    if (typeof onChunk === 'function') {
                      onChunk(data.content, messageId);
                    }
                  } else if (data.type === 'complete') {
                    fullMessage = data.content;
                    if (typeof onChunk === 'function') {
                      onChunk(data.content, messageId, true);
                    }
                  } else if (data.type === 'done') {
                    if (typeof onDone === 'function') {
                      onDone({
                        message: data.message,
                        session_id: sessionId,
                      });
                    }
                  } else if (data.type === 'error') {
                    handleError(new Error(data.error || 'Unknown error'));
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e);
                }
              }
            }
          });
          
          // Continue reading the stream
          return processStream();
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Stream reading error:', err);
            handleError(err);
          }
        });
      }
      
      // Start processing the stream
      return processStream();
    })
    .catch(err => {
      console.error('Fetch error:', err);
      handleError(err);
    });
    
    // Return a function to abort the fetch request
    return () => {
      controller.abort();
    };
  }

  /**
   * Get chat history for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<Array>} Chat history messages
   */
  async getMessages(sessionId) {
    try {
      const response = await axios.get(`${API_URL}/chatbot/history/${sessionId}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }
}

export default new ChatService();