import { useState, useEffect, useRef } from 'react';
import widgetApi from '../services/widgetApi';

const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [syncStatus, setSyncStatus] = useState('initializing');
  const pollingIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Get API key and client info from URL params
  const getCredentials = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      apiKey: urlParams.get('api_key'),
      clientId: urlParams.get('client_id'),
      token: urlParams.get('token')
    };
  };

  // Check if we're in test/development mode
  const isTestMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('test') === 'true' || 
           urlParams.get('inline') === 'true' ||
           window.location.hostname === 'localhost';
  };

  // Fetch settings from API
  const fetchSettings = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setSyncStatus('fetching');
      }

      const credentials = getCredentials();
      
      if (!credentials.apiKey && !credentials.token) {
        throw new Error('No authentication provided');
      }

      console.log('🔄 Fetching widget settings...', { 
        apiKey: credentials.apiKey ? `${credentials.apiKey.substring(0, 8)}...` : 'none',
        token: credentials.token ? 'present' : 'none',
        isRetry 
      });

      const data = await widgetApi.getSettings(credentials);
      
      // Validate settings data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid settings data received');
      }

      setSettings(data);
      setError(null);
      setLastFetch(new Date());
      setSyncStatus('synced');
      
      console.log('✅ Widget settings loaded successfully:', data);

    } catch (err) {
      console.error('❌ Error fetching settings:', err);
      setError(err.message);
      setSyncStatus('error');
      
      // Set default settings on error to keep widget functional
      if (!settings) {
        const defaultSettings = {
          primary_color: '#ea580c',
          chatbot_name: 'AI Assistant',
          greeting_message: 'Hello! How can I help you today?',
          widget_position: 'bottom-right',
          show_typing_indicator: true,
          enable_suggestions: true,
          llm_provider: 'deepseek',
          llm_model: 'deepseek-chat',
          reset_on_page_refresh: true,
          session_timeout: 30
        };
        
        setSettings(defaultSettings);
        console.warn('🔧 Using default settings due to API error');
      }

      // Retry logic for failed requests
      if (!isRetry) {
        scheduleRetry();
      }
    } finally {
      setLoading(false);
    }
  };

  // Schedule retry for failed requests
  const scheduleRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Retrying settings fetch...');
      fetchSettings(true);
    }, 5000); // Retry after 5 seconds
  };

  // Setup polling for settings updates
  const setupPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Different polling intervals based on mode
    const pollingInterval = isTestMode() ? 10000 : 30000; // 10s for test, 30s for production
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        setSyncStatus('polling');
        await fetchSettings(false);
      } catch (error) {
        console.warn('⚠️ Polling update failed:', error.message);
        setSyncStatus('poll_error');
      }
    }, pollingInterval);

    console.log(`🔄 Settings polling started (${pollingInterval/1000}s interval)`);
  };

  // Handle visibility change to pause/resume polling
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('📴 Page hidden - pausing settings polling');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } else {
      console.log('📱 Page visible - resuming settings polling');
      setupPolling();
    }
  };

  // Initialize settings on mount
  useEffect(() => {
    fetchSettings();
    
    // Setup polling after initial fetch
    const setupTimer = setTimeout(() => {
      setupPolling();
    }, 1000);

    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(setupTimer);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for postMessage settings updates (from TestChatbotPage)
  useEffect(() => {
    const handlePostMessage = (event) => {
      // Only handle settings updates
      if (event.data?.type === 'SETTINGS_UPDATE' && event.data?.settings) {
        console.log('📨 Received settings update via postMessage');
        
        // Merge with existing settings
        setSettings(prevSettings => {
          const updatedSettings = { ...prevSettings, ...event.data.settings };
          console.log('🔄 Settings updated via postMessage:', updatedSettings);
          setSyncStatus('live_sync');
          return updatedSettings;
        });

        // Reset sync status after a delay
        setTimeout(() => {
          setSyncStatus('synced');
        }, 2000);
      }
    };

    window.addEventListener('message', handlePostMessage);
    
    return () => {
      window.removeEventListener('message', handlePostMessage);
    };
  }, []);

  // Force refresh settings (for manual triggers)
  const refreshSettings = async () => {
    console.log('🔄 Manual settings refresh triggered');
    setLoading(true);
    setSyncStatus('refreshing');
    await fetchSettings();
  };

  // Get current sync status with human-readable message
  const getSyncStatusMessage = () => {
    switch (syncStatus) {
      case 'initializing': return 'Initializing settings...';
      case 'fetching': return 'Loading settings...';
      case 'synced': return 'Settings synchronized';
      case 'polling': return 'Checking for updates...';
      case 'live_sync': return 'Live sync active';
      case 'refreshing': return 'Refreshing settings...';
      case 'error': return 'Settings sync error';
      case 'poll_error': return 'Update check failed';
      default: return 'Unknown status';
    }
  };

  // Return enhanced hook data
  return { 
    settings, 
    loading, 
    error, 
    lastFetch,
    syncStatus,
    syncStatusMessage: getSyncStatusMessage(),
    isTestMode: isTestMode(),
    refetch: refreshSettings,
    
    // Additional metadata for debugging
    debug: {
      pollingActive: !!pollingIntervalRef.current,
      credentials: getCredentials(),
      lastFetch: lastFetch?.toISOString(),
      settingsKeys: settings ? Object.keys(settings) : []
    }
  };
};

export default useSettings;