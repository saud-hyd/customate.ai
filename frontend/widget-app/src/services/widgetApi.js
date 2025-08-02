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
    try {
      const response = await fetch(`${this.baseURL}/api/widget/settings`, {
        method: 'GET',
        headers: this.getHeaders(credentials)
      });

      if (!response.ok) {
        throw new Error(`Settings request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching widget settings:', error);
      throw error;
    }
  }

  // SIMPLIFIED: Single-path streaming with clear completion
  async sendMessageStream(credentials, message, sessionId, callbacks) {
    const requestBody = {
      message,
      session_id: sessionId
    };

    console.log('🚀 Starting stream request...');

    // Simple state tracking
    let isCompleted = false;
    let accumulatedContent = '';

    try {
      const isDemo = credentials.apiKey?.startsWith('demo_');
      const endpoint = isDemo
        ? `${this.baseURL}/api/demo/message/stream`
        : `${this.baseURL}/api/widget/message/stream`;
      console.log(`📡 Using ${isDemo ? 'DEMO' : 'REGULAR'} endpoint:`, endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream request failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Simple timeout - 30 seconds max
      const timeout = setTimeout(() => {
        if (!isCompleted) {
          console.log('⏰ Stream timeout - completing');
          this._completeStream(callbacks, accumulatedContent);
          isCompleted = true;
        }
      }, 30000);

      while (!isCompleted) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && !isCompleted) {
            try {
              const eventData = line.substring(6).trim();
              
              if (!eventData || eventData === '[DONE]') {
                continue;
              }
              
              const data = JSON.parse(eventData);
              
              // SIMPLIFIED: Handle only essential events
              switch (data.type) {
                case 'info':
                  callbacks.onInfo?.(data);
                  break;
                  
                case 'chunk':
                  accumulatedContent += data.content || '';
                  callbacks.onChunk?.(data.content || '');
                  break;
                  
                case 'complete':
                case 'done':
                  // SINGLE completion path
                  clearTimeout(timeout);
                  const finalContent = data.content || data.message?.content || accumulatedContent;
                  this._completeStream(callbacks, finalContent);
                  isCompleted = true;
                  return;
                  
                case 'error':
                  clearTimeout(timeout);
                  callbacks.onError?.(data.error || 'Stream error');
                  isCompleted = true;
                  return;
              }
            } catch (e) {
              console.error('❌ Error parsing stream data:', e);
              continue;
            }
          }
        }
      }

      // Final cleanup if stream ended naturally
      if (!isCompleted) {
        clearTimeout(timeout);
        this._completeStream(callbacks, accumulatedContent);
      }

    } catch (error) {
      console.error('❌ Stream error:', error);
      callbacks.onError?.(error.message);
    }
  }

  // SIMPLIFIED: Single completion method
  _completeStream(callbacks, content) {
    console.log('✅ Stream completed with content length:', content?.length || 0);
    callbacks.onComplete?.(content || '');
  }

  // Test connection
  async testConnection(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/widget/test`, {
        method: 'GET',
        headers: this.getHeaders(credentials)
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }
}

export default new WidgetApi();