// frontend/dashboard/src/widget/config.js

// Singleton config object
let widgetConfig = {
  apiKey: 'demo-api-key',  // Default API key for testing
  apiUrl: 'http://localhost:8000',  // Point to local development server
  position: 'bottom-right',
  primaryColor: '#4f46e5',
  greeting: 'Hello! How can I help you today?',
  title: 'Chat with us',
  enableTypingIndicator: true,
  enableSuggestions: true,
  showInitiallyOpen: false,
  autoInitialize: true,
  height: '500px',
  width: '350px',
  maxWidth: '420px',
  hideOnMobile: false,
  mobileBreakpoint: 768,
  zIndex: 999999,
  disableAnimations: false,
  userId: null,
  customData: {},
  // Session management options
  resetOnPageRefresh: true,
  sessionTimeout: 30, // Session timeout in minutes
};

let configLoaded = false;

/**
 * Set the widget configuration
 * @param {Object} config - Complete configuration object
 */
export const setConfig = (config) => {
  widgetConfig = { ...widgetConfig, ...config };
};

/**
 * Get the current widget configuration
 * @returns {Object} Current configuration
 */
export const getConfig = () => {
  return { ...widgetConfig };
};

/**
 * Check if configuration has been loaded from server
 * @returns {boolean} - Whether configuration has been loaded
 */
export const isConfigLoaded = () => {
  return configLoaded;
};

/**
 * Merge a new configuration with the existing one
 * @param {Object} baseConfig - Base configuration
 * @param {Object} newConfig - New configuration options to merge
 * @returns {Object} Merged configuration
 */
export const mergeConfig = (baseConfig, newConfig) => {
  // Handle nested objects like customData separately
  const mergedCustomData = {
    ...(baseConfig.customData || {}),
    ...(newConfig.customData || {})
  };

  const merged = {
    ...baseConfig,
    ...newConfig,
    customData: mergedCustomData
  };

  // Validate and adjust the merged config
  return validateConfig(merged);
};

/**
 * Validate configuration values and set defaults for invalid values
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration
 */
const validateConfig = (config) => {
  // Clone to avoid modifying the input
  const validated = { ...config };

  // Ensure position is valid
  const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
  if (!validPositions.includes(validated.position)) {
    console.warn(`Invalid position: ${validated.position}. Using default: bottom-right`);
    validated.position = 'bottom-right';
  }

  // Validate color format (simple validation for hex colors)
  if (validated.primaryColor && !validated.primaryColor.match(/^#([0-9A-F]{3}){1,2}$/i)) {
    console.warn(`Invalid primary color: ${validated.primaryColor}. Using default: #4f46e5`);
    validated.primaryColor = '#4f46e5';
  }

  // Ensure zIndex is a number
  if (typeof validated.zIndex !== 'number') {
    validated.zIndex = parseInt(validated.zIndex, 10) || 999999;
  }

  // Ensure mobileBreakpoint is a number
  if (typeof validated.mobileBreakpoint !== 'number') {
    validated.mobileBreakpoint = parseInt(validated.mobileBreakpoint, 10) || 768;
  }
  
  // Ensure sessionTimeout is a number and within reasonable limits
  if (typeof validated.sessionTimeout !== 'number' || validated.sessionTimeout < 1) {
    validated.sessionTimeout = 30; // Default to 30 minutes
  } else if (validated.sessionTimeout > 1440) {
    validated.sessionTimeout = 1440; // Max 24 hours
  }

  // Boolean values
  validated.enableTypingIndicator = Boolean(validated.enableTypingIndicator);
  validated.enableSuggestions = Boolean(validated.enableSuggestions);
  validated.showInitiallyOpen = Boolean(validated.showInitiallyOpen);
  validated.autoInitialize = Boolean(validated.autoInitialize);
  validated.hideOnMobile = Boolean(validated.hideOnMobile);
  validated.disableAnimations = Boolean(validated.disableAnimations);
  validated.resetOnPageRefresh = Boolean(validated.resetOnPageRefresh);

  return validated;
};

/**
 * Generate CSS variables from the configuration
 * @returns {Object} CSS variables as a style object
 */
export const generateCssVariables = () => {
  const config = getConfig();
  
  return {
    '--customate-primary-color': config.primaryColor || '#4f46e5',
    '--customate-primary-dark': darkenColor(config.primaryColor || '#4f46e5', 0.2),
    '--customate-primary-light': lightenColor(config.primaryColor || '#4f46e5', 0.2),
    '--customate-text-color': '#333333',
    '--customate-text-light': '#ffffff',
    '--customate-background': '#ffffff',
    '--customate-secondary-background': '#f5f5f5',
    '--customate-border-color': '#e0e0e0',
    '--customate-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
    '--customate-widget-height': config.height || '500px',
    '--customate-widget-width': config.width || '350px',
    '--customate-widget-max-width': config.maxWidth || '420px',
  };
};

/**
 * Helper function to darken a hex color
 * @param {string} color - Hex color to darken
 * @param {number} amount - Amount to darken (0-1)
 * @returns {string} Darkened hex color
 */
const darkenColor = (color, amount) => {
  let usePound = false;
  
  if (color[0] === "#") {
    color = color.slice(1);
    usePound = true;
  }

  // Convert 3-digit hex to 6-digit
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));

  return (usePound ? "#" : "") + 
    (r.toString(16).padStart(2, '0')) +
    (g.toString(16).padStart(2, '0')) +
    (b.toString(16).padStart(2, '0'));
};

/**
 * Helper function to lighten a hex color
 * @param {string} color - Hex color to lighten
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {string} Lightened hex color
 */
const lightenColor = (color, amount) => {
  let usePound = false;
  
  if (color[0] === "#") {
    color = color.slice(1);
    usePound = true;
  }

  // Convert 3-digit hex to 6-digit
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  r = Math.min(255, Math.floor(r + (255 - r) * amount));
  g = Math.min(255, Math.floor(g + (255 - g) * amount));
  b = Math.min(255, Math.floor(b + (255 - b) * amount));

  return (usePound ? "#" : "") + 
    (r.toString(16).padStart(2, '0')) +
    (g.toString(16).padStart(2, '0')) +
    (b.toString(16).padStart(2, '0'));
};

/**
 * Load configuration from server directly
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Loaded configuration or null on error
 */
export const loadConfigFromServer = async (apiKey) => {
  try {
    const config = getConfig();
    const baseUrl = config.apiUrl || 'http://localhost:8000';
    
    const response = await fetch(`${baseUrl}/api/widget/settings`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey || config.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    const configData = await response.json();
    
    // Map API field names to local config names
    const mappedConfig = {
      primaryColor: configData.primary_color,
      title: configData.chatbot_name,
      greeting: configData.greeting_message,
      position: configData.widget_position,
      enableTypingIndicator: configData.show_typing_indicator,
      enableSuggestions: configData.enable_suggestions,
      sessionTimeout: configData.session_timeout || 30,
      resetOnPageRefresh: configData.reset_on_page_refresh !== undefined ? 
        configData.reset_on_page_refresh : true
    };
    
    // Filter out undefined values
    const filteredConfig = {};
    for (const [key, value] of Object.entries(mappedConfig)) {
      if (value !== undefined) {
        filteredConfig[key] = value;
      }
    }
    
    // Update the configuration
    setConfig(mergeConfig(getConfig(), filteredConfig));
    configLoaded = true;
    
    return filteredConfig;
  } catch (error) {
    console.error('Error loading widget configuration:', error);
    return null;
  }
};