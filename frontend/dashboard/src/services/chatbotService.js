// frontend/dashboard/src/services/chatService.js
// Implement streaming support

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
    // Create EventSource for Server-Sent Events
    const source = new EventSource(
      `${API_URL}/chatbot/message/stream?api_key=${encodeURIComponent(this.apiKey)}`,
      {
        withCredentials: true,
      }
    );

    // Make the request data
    const requestData = {
      message,
      session_id: sessionId,
    };

    // Create a flag to track if we're done
    let isComplete = false;
    let messageId = null;
    let fullMessage = '';

    // Setup event handlers
    source.onopen = () => {
      // Send the message data
      fetch(`${API_URL}/chatbot/message/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestData),
      }).catch((err) => {
        source.close();
        onError(err);
      });
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'info':
            // Store session info
            sessionId = data.session_id;
            break;
            
          case 'chunk':
            // Process text chunk
            if (!messageId) {
              messageId = data.message_id;
            }
            fullMessage += data.content;
            onChunk(data.content, messageId);
            break;
            
          case 'complete':
            // If we received a complete message (usually after processing)
            fullMessage = data.content;
            onChunk(data.content, messageId, true);
            break;
            
          case 'done':
            // Streaming is complete
            isComplete = true;
            onDone({
              message: data.message,
              session_id: sessionId,
            });
            source.close();
            break;
            
          case 'error':
            // Handle error
            onError(new Error(data.error || 'Unknown error'));
            source.close();
            break;
            
          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
        onError(err);
      }
    };

    source.onerror = (err) => {
      console.error('SSE error:', err);
      if (!isComplete) {
        onError(err);
      }
      source.close();
    };

    // Return a function to close the connection
    return () => {
      source.close();
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