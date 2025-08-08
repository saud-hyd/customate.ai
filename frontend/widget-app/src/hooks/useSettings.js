import { useState, useEffect } from 'react';
import widgetApi from '../services/widgetApi';

const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get API key and client info from URL params
  const getCredentials = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      apiKey: urlParams.get('api_key'),
      clientId: urlParams.get('client_id'),
      token: urlParams.get('token')
    };
  };

  // Fetch settings once
  const fetchSettings = async () => {
    try {
      const credentials = getCredentials();
      
      if (!credentials.apiKey && !credentials.token) {
        throw new Error('No authentication provided');
      }

      console.log('🔧 Fetching widget settings (one-time)...');
      const data = await widgetApi.getSettings(credentials);
      
      // Apply customizations from window configuration if available
      const windowCustomizations = window.REACT_WIDGET_CONFIG?.customizations || {};
      const mergedSettings = {
        ...data,
        ...windowCustomizations
      };
      
      setSettings(mergedSettings);
      setError(null);
      console.log('✅ Widget settings loaded:', mergedSettings);
      if (Object.keys(windowCustomizations).length > 0) {
        console.log('🎨 Applied customizations:', windowCustomizations);
      }
    } catch (err) {
      console.error('❌ Error fetching settings:', err);
      setError(err.message);
      
      // Get customizations from window config even on error
      const windowCustomizations = window.REACT_WIDGET_CONFIG?.customizations || {};
      
      // Set default settings with customizations applied
      const defaultSettings = {
        primary_color: '#ea580c',
        company_name: 'AI Assistant',
        greeting_message: 'Hello! How can I help you today?',
        widget_position: 'bottom-right',
        show_typing_indicator: true,
        enable_suggestions: true,
        llm_provider: 'deepseek',
        llm_model: 'deepseek-chat'
      };
      
      setSettings({
        ...defaultSettings,
        ...windowCustomizations
      });
      
      if (Object.keys(windowCustomizations).length > 0) {
        console.log('🎨 Applied customizations to defaults:', windowCustomizations);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function (can be called when settings are saved)
  const refreshSettings = async () => {
    console.log('🔄 Manually refreshing settings...');
    setLoading(true);
    await fetchSettings();
  };

  // Fetch settings only once on mount - NO POLLING
  useEffect(() => {
    fetchSettings();
    
    // Listen for messages from parent (TestChatbotPage) to refresh settings
    const handleMessage = (event) => {
      if (event.data.type === 'refreshSettings') {
        console.log('📨 Received refresh settings message from parent');
        refreshSettings();
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup - no interval to clear!
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array = run once on mount

  return { 
    settings, 
    loading, 
    error, 
    refetch: fetchSettings,
    refresh: refreshSettings 
  };
};

export default useSettings;