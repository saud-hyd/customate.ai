const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'https://customate-ai-1.onrender.com';

class WidgetApi {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication headers
  getHeaders(credentials) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (credentials.token) {
      headers['Authorization'] = `Bearer ${credentials.token}`;
    } else if (credentials.apiKey) {
      headers['X-API-Key'] = credentials.apiKey;
    }

    return headers;
  }

  // Get widget settings
  async getSettings(credentials) {
    const response = await fetch(`${this.baseURL}/api/widget/settings`, {
      method: 'GET',
      headers: this.getHeaders(credentials)
    });

    if (!response.ok) {
      throw new Error(`Settings request failed: ${response.status}`);
    }

    return await response.json();
  }

  // Send message with streaming
  async sendMessageStream(credentials, message, sessionId, callbacks) {
    const requestBody = {
      message,
      session_id: sessionId
    };

    try {
      const response = await fetch(`${this.baseURL}/api/widget/message/stream`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              switch (data.type) {
                case 'info':
                  callbacks.onInfo?.(data);
                  break;
                case 'chunk':
                  callbacks.onChunk?.(data.content);
                  break;
                case 'complete':
                  callbacks.onComplete?.(data.content);
                  return; // End streaming
                case 'error':
                  callbacks.onError?.(data.error);
                  return;
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError?.(error.message);
    }
  }

  // Send regular message (non-streaming)
  async sendMessage(credentials, message, sessionId) {
    const requestBody = {
      message,
      session_id: sessionId
    };

    const response = await fetch(`${this.baseURL}/api/widget/message`, {
      method: 'POST',
      headers: this.getHeaders(credentials),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Message request failed: ${response.status}`);
    }

    return await response.json();
  }
}

export default new WidgetApi();