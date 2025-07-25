// frontend/dashboard/src/services/clientService.js
import api from './api';

/**
 * Simplified client service with universal one-line widget embed
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
          llm_provider: "openai",
          llm_model: "gpt-4.1-mini-2025-04-14"
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
          llm_provider: 'openai',
          llm_model: 'gpt-4.1-mini-2025-04-14'
        }
      };
    }
  },

  /**
   * Update widget settings (unified endpoint)
   */
  updateWidgetSettings: async (settings) => {
    try {
      const widgetSettings = {
        primary_color: settings.primary_color,
        chatbot_name: settings.chatbot_name,
        greeting_message: settings.greeting_message,
        widget_position: settings.widget_position,
        show_typing_indicator: settings.show_typing_indicator,
        enable_suggestions: settings.enable_suggestions,
        reset_on_page_refresh: settings.reset_on_page_refresh,
        session_timeout: settings.session_timeout,
        llm_provider:"openai", 
        llm_model: "gpt-4.1-mini-2025-04-14",
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
   * Get universal widget embed code (simplified one-line approach)
   */
  getWidgetEmbedCode: async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      return {
        // Primary embed code (what customers actually use)
        embed_code: `<script async src="${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}"></script>`,
        
        // Alternative shorter URL
        embed_code_short: `<script async src="${backendUrl}/api/widget/widget.js?key=${clientInfo.api_key}"></script>`,
        
        // Configuration
        api_key: clientInfo.api_key,
        backend_url: backendUrl,
        widget_type: 'universal_embed',
        
        // Additional options for advanced users
        advanced_options: {
          position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
          theme: 'auto', // auto, light, dark
          custom_url: `${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}&position=bottom-right&theme=auto`
        },
        
        // Setup information
        setup_info: {
          lines_of_code: 1,
          setup_time_seconds: 30,
          technical_knowledge_required: false,
          works_everywhere: true,
          auto_updates: true,
          maintenance_required: false
        }
      };
    } catch (error) {
      console.error('Error getting universal widget embed code:', error);
      throw error;
    }
  },

  /**
   * Legacy method - now returns universal embed code for backward compatibility
   */
  getReactWidgetEmbedCode: async () => {
    console.log('⚠️ getReactWidgetEmbedCode is deprecated. Use getWidgetEmbedCode instead.');
    return await clientService.getWidgetEmbedCode();
  },

  /**
   * Test widget functionality
   */
  testWidget: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test widget endpoints
      const [widgetAppTest, settingsTest, embedTest] = await Promise.all([
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
        fetch(`${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}`, {
          method: 'HEAD'
        })
      ]);
      
      if (!widgetAppTest.ok || !settingsTest.ok || !embedTest.ok) {
        throw new Error(`Widget test failed: App:${widgetAppTest.status} Settings:${settingsTest.status} Embed:${embedTest.status}`);
      }
      
      const settingsData = await settingsTest.json();
      
      return {
        success: true,
        data: { status: 'All systems operational' },
        settings: settingsData,
        backend_url: backendUrl,
        widget_type: 'universal_embed',
        message: 'Universal widget embed and settings working correctly'
      };
    } catch (error) {
      console.error('Error testing widget:', error);
      return {
        success: false,
        error: error.message,
        widget_type: 'universal_embed'
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
        throw new Error(`Widget message failed: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending test message to widget:', error);
      throw error;
    }
  },

  /**
   * Trigger widget reload - universal embed auto-updates
   */
  triggerWidgetReload: async () => {
    try {
      console.log('🔄 Widget settings updated - universal embed widgets auto-update instantly');
      
      return {
        success: true,
        message: 'Universal widget settings updated - auto-sync active',
        sync_method: 'real_time',
        sync_interval: 'instant'
      };
    } catch (error) {
      console.error('Error triggering widget reload:', error);
      throw error;
    }
  },

  /**
   * Update LLM configuration
   */
  updateLLMConfig: async (provider, model) => {
    try {
      const currentSettings = await clientService.getSettings();
      
      const updatedSettings = {
        ...currentSettings,
        custom_settings: {
          ...currentSettings.custom_settings,
          llm_provider: "openai",
          llm_model: "gpt-4.1-mini-2025-04-14"
        }
      };
      
      const result = await clientService.updateWidgetSettings(updatedSettings);
      
      // Trigger widget reload
      await clientService.triggerWidgetReload();
      
      return {
        ...result,
        widget_type: 'universal_embed',
        llm_provider: provider,
        llm_model: model
      };
    } catch (error) {
      console.error('Error updating LLM config for widget:', error);
      throw error;
    }
  },

  /**
   * Check backend connectivity
   */
  checkConnection: async () => {
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      const clientInfo = await clientService.getClientInfo();
      
      // Test multiple endpoints for universal widget
      const tests = await Promise.allSettled([
        fetch(`${backendUrl}/health`),
        fetch(`${backendUrl}/api/widget/health`),
        fetch(`${backendUrl}/api/widget/app/`, { method: 'HEAD' }),
        fetch(`${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}`, { method: 'HEAD' }),
        fetch(`${backendUrl}/api/widget/settings`, {
          headers: { 'X-API-Key': clientInfo.api_key }
        })
      ]);
      
      const results = tests.map((test, index) => ({
        endpoint: ['health', 'widget-health', 'widget-app', 'embed-script', 'widget-settings'][index],
        success: test.status === 'fulfilled' && test.value.ok,
        status: test.status === 'fulfilled' ? test.value.status : 'failed'
      }));
      
      const allSuccessful = results.every(r => r.success);
      
      return {
        success: allSuccessful,
        backend_url: backendUrl,
        widget_type: 'universal_embed',
        tests: results,
        message: allSuccessful ? 'All universal widget connections successful' : 'Some widget connections failed'
      };
    } catch (error) {
      console.error('Error checking widget connection:', error);
      return {
        success: false,
        error: error.message,
        widget_type: 'universal_embed'
      };
    }
  },

  /**
   * Get widget configuration for embedding (simplified)
   */
  getWidgetConfig: async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      const settings = await clientService.getSettings();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      return {
        // Universal embed details
        embed_url: `${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}`,
        api_key: clientInfo.api_key,
        settings: settings,
        
        // Widget will auto-configure based on these settings
        auto_config: {
          position: settings.widget_position || 'bottom-right',
          theme: 'auto',
          responsive: true,
          mobile_optimized: true
        },
        
        // Setup information
        implementation: {
          method: 'universal_script',
          complexity: 'minimal',
          setup_time: '30_seconds',
          maintenance: 'zero'
        }
      };
    } catch (error) {
      console.error('Error getting widget config:', error);
      throw error;
    }
  },

  /**
   * Legacy method - now returns simplified widget config
   */
  getReactWidgetConfig: async () => {
    console.log('⚠️ getReactWidgetConfig is deprecated. Use getWidgetConfig instead.');
    return await clientService.getWidgetConfig();
  },

  /**
   * Verify widget setup (new method for testing customer implementation)
   */
  verifyWidgetSetup: async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      // Test the verification endpoint
      const response = await fetch(`${backendUrl}/api/widget/verify?api_key=${clientInfo.api_key}`);
      
      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        ...result,
        embed_code: `<script async src="${backendUrl}/api/widget/embed.js?api_key=${clientInfo.api_key}"></script>`,
        verification_url: `${backendUrl}/api/widget/verify?api_key=${clientInfo.api_key}`
      };
    } catch (error) {
      console.error('Error verifying widget setup:', error);
      return {
        status: 'error',
        message: 'Verification failed',
        error: error.message
      };
    }
  }
};

export default clientService;