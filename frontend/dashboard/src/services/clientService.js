// frontend/dashboard/src/services/clientService.js
import api from './api';

/**
 * Enhanced service for client-related API operations
 * Includes support for widget settings, LLM configuration, and real-time testing
 */
const clientService = {
  /**
   * Get client information
   * @returns {Promise<Object>} Client data
   */
  getClientInfo: async () => {
    try {
      const response = await api.get('/api/client');
      return response.data;
    } catch (error) {
      console.error('Error getting client info:', error);
      throw error;
    }
  },

  /**
   * Get API key for the current client
   * @returns {Promise<string>} The client's API key
   */
  getApiKey: async () => {
    try {
      const response = await api.get('/api/client');
      return response.data.api_key;
    } catch (error) {
      console.error('Error getting client API key:', error);
      throw error;
    }
  },

  /**
   * Update client settings (general client settings)
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  updateSettings: async (settings) => {
    try {
      const response = await api.put('/api/client/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating client settings:', error);
      throw error;
    }
  },
  
  /**
   * Get widget settings (specific to widget configuration)
   * @returns {Promise<Object>} Widget settings
   */
  getSettings: async () => {
    try {
      // Try to get widget-specific settings first
      try {
        const response = await api.get('/api/widget/settings');
        return response.data;
      } catch (widgetError) {
        // Fallback to general client settings if widget endpoint is not available
        console.warn('Widget settings endpoint not available, falling back to client settings');
        const response = await api.get('/api/client/settings');
        
        // Transform client settings to widget settings format
        const clientSettings = response.data;
        return {
          primary_color: clientSettings.primary_color || '#ea580c',
          chatbot_name: clientSettings.chatbot_name || 'AI Assistant',
          greeting_message: clientSettings.greeting_message || 'Hello! How can I help you today?',
          widget_position: clientSettings.widget_position || 'bottom-right',
          show_typing_indicator: clientSettings.enable_typing_indicator !== undefined ? clientSettings.enable_typing_indicator : true,
          enable_suggestions: clientSettings.enable_suggestions !== undefined ? clientSettings.enable_suggestions : true,
          reset_on_page_refresh: clientSettings.reset_on_page_refresh !== undefined ? clientSettings.reset_on_page_refresh : true,
          session_timeout: clientSettings.session_timeout || 30,
          custom_settings: clientSettings.custom_settings || {}
        };
      }
    } catch (error) {
      console.error('Error getting widget settings:', error);
      // Return default settings if all else fails
      return {
        primary_color: '#ea580c',
        chatbot_name: 'AI Assistant',
        greeting_message: 'Hello! How can I help you today?',
        widget_position: 'bottom-right',
        show_typing_indicator: true,
        enable_suggestions: true,
        reset_on_page_refresh: true,
        session_timeout: 30,
        custom_settings: {}
      };
    }
  },

  /**
   * Update widget settings (enhanced with LLM configuration)
   * @param {Object} settings - Widget settings to update
   * @returns {Promise<Object>} Updated settings
   */
  updateWidgetSettings: async (settings) => {
    try {
      // Ensure custom_settings is properly structured
      const structuredSettings = {
        ...settings,
        custom_settings: {
          ...settings.custom_settings,
          // Ensure LLM settings are preserved
          llm_provider: settings.custom_settings?.llm_provider,
          llm_model: settings.custom_settings?.llm_model,
        }
      };

      console.log('Updating widget settings:', structuredSettings);

      // Try widget-specific endpoint first
      try {
        const response = await api.put('/api/widget/settings', structuredSettings);
        return response.data;
      } catch (widgetError) {
        // Fallback to client settings endpoint
        console.warn('Widget settings endpoint not available, using client settings endpoint');
        const response = await api.put('/api/client/settings', structuredSettings);
        return response.data;
      }
    } catch (error) {
      console.error('Error updating widget settings:', error);
      throw error;
    }
  },
  
  /**
   * Get widget embed code
   * @returns {Promise<Object>} Embed code data
   */
  getWidgetEmbedCode: async () => {
    try {
      const response = await api.get('/api/widget/embed');
      return response.data;
    } catch (error) {
      console.error('Error getting widget embed code:', error);
      
      // Generate fallback embed code
      const clientInfo = await clientService.getClientInfo();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      return {
        embed_code: `<!-- Customate.ai Chat Widget -->
<script>
  window.customateConfig = {
    apiKey: '${clientInfo.api_key}',
    apiUrl: '${backendUrl}'
  };
</script>
<script src="${backendUrl}/api/widget/widget.js" async></script>`,
        api_key: clientInfo.api_key,
        backend_url: backendUrl
      };
    }
  },

  /**
   * Test widget functionality
   * @returns {Promise<Object>} Test results
   */
  testWidget: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      const response = await fetch(`${backendUrl}/api/widget/test`, {
        method: 'GET',
        headers: {
          'X-API-Key': clientInfo.api_key,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Widget test failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        data,
        backend_url: backendUrl
      };
    } catch (error) {
      console.error('Error testing widget:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Send a test message to the widget
   * @param {string} message - Test message
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<Object>} Response from widget
   */
  sendTestMessage: async (message, sessionId = null) => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      const response = await fetch(`${backendUrl}/api/widget/message`, {
        method: 'POST',
        headers: {
          'X-API-Key': clientInfo.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Message failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  },

  /**
   * Get widget configuration for testing
   * @returns {Promise<Object>} Widget configuration
   */
  getWidgetConfig: async () => {
    try {
      const response = await api.get('/api/widget/config');
      return response.data;
    } catch (error) {
      console.error('Error getting widget config:', error);
      
      // Generate fallback config
      const clientInfo = await clientService.getClientInfo();
      const settings = await clientService.getSettings();
      
      return {
        client_id: clientInfo.client_id,
        api_key: clientInfo.api_key,
        settings: {
          primary_color: settings.primary_color || '#ea580c',
          chatbot_name: settings.chatbot_name || 'AI Assistant',
          greeting_message: settings.greeting_message || 'Hello! How can I help you today?',
          enable_suggestions: settings.enable_suggestions !== undefined ? settings.enable_suggestions : true,
          show_typing_indicator: settings.show_typing_indicator !== undefined ? settings.show_typing_indicator : true,
          widget_position: settings.widget_position || 'bottom-right',
          llm_provider: settings.custom_settings?.llm_provider || 'deepseek',
          llm_model: settings.custom_settings?.llm_model || 'deepseek-chat'
        }
      };
    }
  },

  /**
   * Check backend connectivity
   * @returns {Promise<Object>} Connection status
   */
  checkConnection: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        status: data.status,
        backend_url: backendUrl,
        version: data.version
      };
    } catch (error) {
      console.error('Error checking connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Update LLM configuration
   * @param {string} provider - LLM provider (deepseek, openai, claude)
   * @param {string} model - Model name
   * @returns {Promise<Object>} Updated configuration
   */
  updateLLMConfig: async (provider, model) => {
    try {
      const currentSettings = await clientService.getSettings();
      
      const updatedSettings = {
        ...currentSettings,
        custom_settings: {
          ...currentSettings.custom_settings,
          llm_provider: provider,
          llm_model: model
        }
      };
      
      return await clientService.updateWidgetSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating LLM config:', error);
      throw error;
    }
  },

  /**
   * Get chat analytics for the client
   * @param {Object} params - Query parameters (date range, etc.)
   * @returns {Promise<Object>} Analytics data
   */
  getChatAnalytics: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/analytics/chat${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat analytics:', error);
      throw error;
    }
  },

  /**
   * Get widget usage statistics
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Usage statistics
   */
  getWidgetStats: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/widget/stats${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error getting widget stats:', error);
      // Return mock data if endpoint is not available
      return {
        total_sessions: 0,
        total_messages: 0,
        avg_response_time: 0,
        satisfaction_score: 0
      };
    }
  }
};

export default clientService;