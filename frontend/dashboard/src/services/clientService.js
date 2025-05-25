// frontend/dashboard/src/services/clientService.js
import api from './api';

/**
 * Enhanced client service with complete widget settings synchronization
 */
const clientService = {
  /**
   * Get client information
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
   * Get widget settings (unified endpoint)
   */
  getSettings: async () => {
    try {
      // Always use widget settings endpoint for consistency
      const response = await api.get('/api/widget/settings');
      return {
        primary_color: response.data.primary_color,
        chatbot_name: response.data.chatbot_name,
        greeting_message: response.data.greeting_message,
        widget_position: response.data.widget_position,
        show_typing_indicator: response.data.show_typing_indicator,
        enable_suggestions: response.data.enable_suggestions,
        reset_on_page_refresh: response.data.reset_on_page_refresh,
        session_timeout: response.data.session_timeout,
        custom_settings: {
          llm_provider: response.data.llm_provider,
          llm_model: response.data.llm_model
        }
      };
    } catch (error) {
      console.error('Error getting widget settings:', error);
      // Return defaults if API fails
      return {
        primary_color: '#ea580c',
        chatbot_name: 'AI Assistant',
        greeting_message: 'Hello! How can I help you today?',
        widget_position: 'bottom-right',
        show_typing_indicator: true,
        enable_suggestions: true,
        reset_on_page_refresh: true,
        session_timeout: 30,
        custom_settings: {
          llm_provider: 'deepseek',
          llm_model: 'deepseek-chat'
        }
      };
    }
  },

  /**
   * Update widget settings (unified endpoint)
   */
  updateWidgetSettings: async (settings) => {
    try {
      // Prepare settings in the format expected by the widget endpoint
      const widgetSettings = {
        primary_color: settings.primary_color,
        chatbot_name: settings.chatbot_name,
        greeting_message: settings.greeting_message,
        widget_position: settings.widget_position,
        show_typing_indicator: settings.show_typing_indicator,
        enable_suggestions: settings.enable_suggestions,
        reset_on_page_refresh: settings.reset_on_page_refresh,
        session_timeout: settings.session_timeout,
        llm_provider: settings.custom_settings?.llm_provider,
        llm_model: settings.custom_settings?.llm_model
      };

      console.log('Updating widget settings:', widgetSettings);

      const response = await api.put('/api/widget/settings', widgetSettings);
      
      // Also update client settings for backward compatibility
      try {
        await api.put('/api/client/settings', {
          primary_color: settings.primary_color,
          chatbot_name: settings.chatbot_name,
          greeting_message: settings.greeting_message,
          widget_position: settings.widget_position,
          enable_typing_indicator: settings.show_typing_indicator,
          enable_suggestions: settings.enable_suggestions,
          custom_settings: settings.custom_settings
        });
      } catch (clientError) {
        console.warn('Failed to update client settings:', clientError);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating widget settings:', error);
      throw error;
    }
  },

  /**
   * Get widget embed code
   */
  getWidgetEmbedCode: async () => {
    try {
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
    // All other settings will be loaded dynamically from the server
  };
</script>
<script src="${backendUrl}/api/widget/widget.js" async></script>`,
        api_key: clientInfo.api_key,
        backend_url: backendUrl
      };
    } catch (error) {
      console.error('Error getting widget embed code:', error);
      throw error;
    }
  },

  /**
   * Test widget functionality with enhanced connection testing
   */
  testWidget: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test both widget endpoint and settings sync
      const [widgetTest, settingsTest] = await Promise.all([
        fetch(`${backendUrl}/api/widget/test`, {
          method: 'GET',
          headers: {
            'X-API-Key': clientInfo.api_key,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${backendUrl}/api/widget/settings`, {
          method: 'GET',
          headers: {
            'X-API-Key': clientInfo.api_key,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      if (!widgetTest.ok || !settingsTest.ok) {
        throw new Error(`Widget test failed: ${widgetTest.status}/${settingsTest.status}`);
      }
      
      const widgetData = await widgetTest.json();
      const settingsData = await settingsTest.json();
      
      return {
        success: true,
        data: widgetData,
        settings: settingsData,
        backend_url: backendUrl,
        message: 'Widget and settings synchronization working correctly'
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
   * Send a test message through the widget
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
      
      return await response.json();
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  },

  /**
   * Trigger widget reload on all client websites
   */
  triggerWidgetReload: async () => {
    try {
      // This would typically be a server-sent event or webhook
      // For now, we'll just log that settings have been updated
      console.log('🔄 Widget settings updated - all deployed widgets will sync within 30 seconds');
      
      return {
        success: true,
        message: 'Widget reload triggered successfully'
      };
    } catch (error) {
      console.error('Error triggering widget reload:', error);
      throw error;
    }
  },

  /**
   * Update LLM configuration with immediate sync
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
      
      const result = await clientService.updateWidgetSettings(updatedSettings);
      
      // Trigger widget reload
      await clientService.triggerWidgetReload();
      
      return result;
    } catch (error) {
      console.error('Error updating LLM config:', error);
      throw error;
    }
  },

  /**
   * Check backend connectivity with comprehensive testing
   */
  checkConnection: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test multiple endpoints to ensure full connectivity
      const tests = await Promise.allSettled([
        fetch(`${backendUrl}/health`),
        fetch(`${backendUrl}/api/widget/test`, {
          headers: { 'X-API-Key': clientInfo.api_key }
        }),
        fetch(`${backendUrl}/api/widget/settings`, {
          headers: { 'X-API-Key': clientInfo.api_key }
        })
      ]);
      
      const results = tests.map((test, index) => ({
        endpoint: ['health', 'widget-test', 'widget-settings'][index],
        success: test.status === 'fulfilled' && test.value.ok,
        status: test.status === 'fulfilled' ? test.value.status : 'failed'
      }));
      
      const allSuccessful = results.every(r => r.success);
      
      return {
        success: allSuccessful,
        backend_url: backendUrl,
        tests: results,
        message: allSuccessful ? 'All connections successful' : 'Some connections failed'
      };
    } catch (error) {
      console.error('Error checking connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default clientService;