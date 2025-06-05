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

  // Send message with streaming
  async sendMessageStream(credentials, message, sessionId, callbacks) {
    const requestBody = {
      message,
      session_id: sessionId
    };

    console.log('🚀 Starting stream request:', {
      url: `${this.baseURL}/api/widget/message/stream`,
      body: requestBody,
      hasApiKey: !!credentials.apiKey
    });

    try {
      const response = await fetch(`${this.baseURL}/api/widget/message/stream`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stream request failed:', response.status, errorText);
        throw new Error(`Stream request failed: ${response.status} - ${errorText}`);
      }

      console.log('✅ Stream response received, processing...');

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let messageCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('📡 Stream reading complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = line.substring(6).trim();
              
              // Skip empty data or [DONE] markers
              if (!eventData || eventData === '[DONE]') {
                console.log('📝 Skipping empty or DONE marker');
                continue;
              }
              
              console.log('📨 Processing stream event:', eventData.substring(0, 100) + '...');
              
              const data = JSON.parse(eventData);
              messageCount++;
              
    switch (data.type) {
    case 'info':
        console.log('📡 INFO event received:', data);
        callbacks.onInfo?.(data);
        break;
        
    case 'chunk':
        console.log('📝 CHUNK event received:', data.content?.substring(0, 30) + '...');
        callbacks.onChunk?.(data.content);
        break;
        
    case 'complete':
        console.log('✅ COMPLETE event received:', data);
        callbacks.onComplete?.(data.content);
        return;
        
    case 'done':
        console.log('✅ DONE event received:', data);
        // Handle both nested and direct content formats
        const finalContent = data.message?.content || data.content || '';
        console.log('📤 Final content length:', finalContent.length);
        callbacks.onComplete?.(finalContent);
        return;
        
    case 'error':
        console.error('❌ ERROR event received:', data.error);
        callbacks.onError?.(data.error);
        return;
        
    case 'warning':
        console.warn('⚠️ WARNING event received:', data.message);
        break;
        
    default:
        console.warn('🤷 UNKNOWN event type received:', data.type, data);
        break;
    }          
  } catch (e) {
              console.error('❌ Error parsing stream data:', e);
              console.error('📄 Raw line that failed:', line);
              // Continue processing other lines - don't fail entire stream
              continue;
            }
          }
        }
      }

      console.log(`📊 Stream processing complete. Processed ${messageCount} messages.`);

      // If we reach here without a proper completion, it might be an issue
      if (messageCount === 0) {
        console.warn('⚠️ No stream messages received');
        callbacks.onError?.('No response received from server');
      }

    } catch (error) {
      console.error('❌ Stream processing error:', error);
      callbacks.onError?.(error.message);
    }
  }

  // Send regular message (non-streaming)
  async sendMessage(credentials, message, sessionId) {
    const requestBody = {
      message,
      session_id: sessionId
    };

    console.log('📤 Sending non-stream message:', {
      url: `${this.baseURL}/api/widget/message`,
      body: requestBody
    });

    try {
      const response = await fetch(`${this.baseURL}/api/widget/message`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Message request failed:', response.status, errorText);
        throw new Error(`Message request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Non-stream message response:', result);
      return result;

    } catch (error) {
      console.error('❌ Message sending error:', error);
      throw error;
    }
  }

  // Test connection to backend
  async testConnection(credentials) {
    try {
      console.log('🧪 Testing widget API connection...');
      
      const response = await fetch(`${this.baseURL}/api/widget/test`, {
        method: 'GET',
        headers: this.getHeaders(credentials)
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Widget API connection test passed:', result);
      return result;

    } catch (error) {
      console.error('❌ Widget API connection test failed:', error);
      throw error;
    }
  }
}

export default new WidgetApi();