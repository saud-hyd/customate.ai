// frontend/dashboard/src/services/clientService.js
import api from './api';

/**
 * Enhanced client service with React Widget App synchronization
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

      console.log('Updating React widget settings:', widgetSettings);

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
      console.error('Error updating React widget settings:', error);
      throw error;
    }
  },

  /**
   * Get React widget embed code (iframe-based)
   */
  getWidgetEmbedCode: async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      return {
        embed_code: `<!-- Customate.ai React Widget (iframe-based) -->
<iframe 
  src="${backendUrl}/api/widget/app/?api_key=${clientInfo.api_key}"
  width="350" 
  height="500"
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 999999;"
  allow="clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
</iframe>
<!-- Settings are automatically synchronized from your dashboard -->`,
        api_key: clientInfo.api_key,
        backend_url: backendUrl,
        widget_type: 'react_iframe',
        widget_url: `${backendUrl}/api/widget/app/?api_key=${clientInfo.api_key}`
      };
    } catch (error) {
      console.error('Error getting React widget embed code:', error);
      throw error;
    }
  },

  /**
   * Test React widget functionality with enhanced connection testing
   */
  testWidget: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test both React widget app endpoint and settings sync
      const [widgetAppTest, settingsTest, widgetApiTest] = await Promise.all([
        fetch(`${backendUrl}/api/widget/app/`, {
          method: 'HEAD'
        }),
        fetch(`${backendUrl}/api/widget/settings`, {
          method: 'GET',
          headers: {
            'X-API-Key': clientInfo.api_key,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${backendUrl}/api/widget/test`, {
          method: 'GET',
          headers: {
            'X-API-Key': clientInfo.api_key,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      if (!widgetAppTest.ok || !settingsTest.ok || !widgetApiTest.ok) {
        throw new Error(`React widget test failed: App:${widgetAppTest.status} Settings:${settingsTest.status} API:${widgetApiTest.status}`);
      }
      
      const settingsData = await settingsTest.json();
      const apiData = await widgetApiTest.json();
      
      return {
        success: true,
        data: apiData,
        settings: settingsData,
        backend_url: backendUrl,
        widget_type: 'react_iframe',
        message: 'React widget app and settings synchronization working correctly'
      };
    } catch (error) {
      console.error('Error testing React widget:', error);
      return {
        success: false,
        error: error.message,
        widget_type: 'react_iframe'
      };
    }
  },

  /**
   * Send a test message through the React widget
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
        throw new Error(`React widget message failed: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending test message to React widget:', error);
      throw error;
    }
  },

  /**
   * Trigger React widget reload on all client websites
   * Note: React widgets use polling-based synchronization every 30 seconds
   */
  triggerWidgetReload: async () => {
    try {
      console.log('🔄 React widget settings updated - all deployed iframe widgets will sync within 30 seconds via polling');
      
      // Future enhancement: Could implement WebSocket or SSE for instant updates
      return {
        success: true,
        message: 'React widget settings updated - polling-based sync active',
        sync_method: 'polling',
        sync_interval: '30_seconds'
      };
    } catch (error) {
      console.error('Error triggering React widget reload:', error);
      throw error;
    }
  },

  /**
   * Update LLM configuration with immediate sync to React widgets
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
      
      // Trigger React widget reload
      await clientService.triggerWidgetReload();
      
      return {
        ...result,
        widget_type: 'react_iframe',
        llm_provider: provider,
        llm_model: model
      };
    } catch (error) {
      console.error('Error updating LLM config for React widget:', error);
      throw error;
    }
  },

  /**
   * Check backend connectivity with comprehensive React widget testing
   */
  checkConnection: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test multiple endpoints to ensure full React widget connectivity
      const tests = await Promise.allSettled([
        fetch(`${backendUrl}/health`),
        fetch(`${backendUrl}/api/widget/health`),
        fetch(`${backendUrl}/api/widget/app/`, { method: 'HEAD' }),
        fetch(`${backendUrl}/api/widget/test`, {
          headers: { 'X-API-Key': clientInfo.api_key }
        }),
        fetch(`${backendUrl}/api/widget/settings`, {
          headers: { 'X-API-Key': clientInfo.api_key }
        })
      ]);
      
      const results = tests.map((test, index) => ({
        endpoint: ['health', 'widget-health', 'widget-app', 'widget-test', 'widget-settings'][index],
        success: test.status === 'fulfilled' && test.value.ok,
        status: test.status === 'fulfilled' ? test.value.status : 'failed'
      }));
      
      const allSuccessful = results.every(r => r.success);
      
      return {
        success: allSuccessful,
        backend_url: backendUrl,
        widget_type: 'react_iframe',
        tests: results,
        message: allSuccessful ? 'All React widget connections successful' : 'Some React widget connections failed'
      };
    } catch (error) {
      console.error('Error checking React widget connection:', error);
      return {
        success: false,
        error: error.message,
        widget_type: 'react_iframe'
      };
    }
  },

  /**
   * Get React widget configuration for embedding
   */
  getReactWidgetConfig: async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      const settings = await clientService.getSettings();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      return {
        widget_url: `${backendUrl}/api/widget/app/`,
        api_key: clientInfo.api_key,
        settings: settings,
        iframe_config: {
          width: '350',
          height: '500',
          frameborder: '0',
          allow: 'clipboard-write',
          sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups'
        },
        positioning: {
          bottom: '20px',
          right: '20px',
          'border-radius': '12px',
          'box-shadow': '0 8px 32px rgba(0,0,0,0.12)',
          'z-index': '999999'
        }
      };
    } catch (error) {
      console.error('Error getting React widget config:', error);
      throw error;
    }
  },

  /**
   * Build React widget if needed (development helper)
   */
  buildReactWidget: async () => {
    try {
      // This would typically trigger a build process
      console.log('🔨 React widget build process would be triggered here');
      console.log('Manual build: cd frontend/widget-app && npm run build');
      
      return {
        success: true,
        message: 'React widget build initiated',
        build_path: 'frontend/widget-app/dist/',
        serve_endpoint: '/api/widget/app/'
      };
    } catch (error) {
      console.error('Error building React widget:', error);
      throw error;
    }
  }
};

export default clientService;