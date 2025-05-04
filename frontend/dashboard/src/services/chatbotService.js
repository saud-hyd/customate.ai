// frontend/dashboard/src/services/chatService.js
// Implement streaming support

import axios from 'axios';
import { API_URL, API_BASE_URL } from '../utils/environment';

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
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
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
    // Create request data
    const requestData = {
      message,
      session_id: sessionId,
    };
    
    // Use fetch with ReadableStream API instead of EventSource
    // This is more compatible with POST requests that need streaming responses
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Start the fetch request
    fetch(`${API_URL}/chatbot/message/stream`, {
      method: 'POST',
      headers: this.getHeaders(),
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
                console.error('Error parsing final SSE chunk:', e);
              }
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
          
          // Continue reading the stream
          return processStream();
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Stream reading error:', err);
            onError(err);
          }
        });
      }
      
      // Start processing the stream
      return processStream();
    })
    .catch(err => {
      console.error('Fetch error:', err);
      onError(err);
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
  async getChatHistory(sessionId) {
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