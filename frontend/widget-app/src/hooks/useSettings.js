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

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const credentials = getCredentials();
      
      if (!credentials.apiKey && !credentials.token) {
        throw new Error('No authentication provided');
      }

      const data = await widgetApi.getSettings(credentials);
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      
      // Set default settings on error
      setSettings({
        primary_color: '#ea580c',
        chatbot_name: 'AI Assistant',
        greeting_message: 'Hello! How can I help you today?',
        widget_position: 'bottom-right',
        show_typing_indicator: true,
        enable_suggestions: true,
        llm_provider: 'deepseek',
        llm_model: 'deepseek-chat'
      });
    } finally {
      setLoading(false);
    }
  };

  // Polling for settings updates (every 30 seconds)
  useEffect(() => {
    fetchSettings();
    
    const interval = setInterval(fetchSettings, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { settings, loading, error, refetch: fetchSettings };
};

export default useSettings;