import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './styles/widget.css';
import './styles/themes.css';
import './styles/animations.css';
import { setConfig, getConfig, mergeConfig } from './config';
import { initializeSession } from './utils/session';
import { trackEvent } from './utils/analytics';

// Default configuration for the widget
const defaultConfig = {
  apiKey: null,
  apiUrl: 'https://api.customate.ai',
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
  customData: {}
};

// Widget container class
class Widget {
  constructor() {
    this.initialized = false;
    this.containerElement = null;
    this.root = null;
  }

  /**
   * Initialize the widget with configuration
   * @param {Object} userConfig - User configuration to override defaults
   */
  init(userConfig = {}) {
    if (!userConfig.apiKey && !defaultConfig.apiKey) {
      console.error('Customate Widget Error: API key is required');
      return;
    }

    // Merge configurations
    const config = mergeConfig(defaultConfig, userConfig);
    setConfig(config);

    // Don't initialize if it should be hidden on mobile and we're on mobile
    if (config.hideOnMobile && window.innerWidth <= config.mobileBreakpoint) {
      return;
    }

    // Initialize tracking and session
    initializeSession(config);
    trackEvent('widget_initialized', { position: config.position });

    // Create container if it doesn't exist
    if (!this.containerElement) {
      this.containerElement = document.createElement('div');
      this.containerElement.className = 'customate-widget-container';
      this.containerElement.setAttribute('data-position', config.position);
      document.body.appendChild(this.containerElement);
    }

    // Apply z-index
    this.containerElement.style.zIndex = config.zIndex.toString();

    // Create root if needed
    if (!this.root) {
      this.root = createRoot(this.containerElement);
    }

    // Render the widget
    this.root.render(
      <React.StrictMode>
        <ChatWidget />
      </React.StrictMode>
    );

    this.initialized = true;
    return this;
  }

  /**
   * Open the widget programmatically
   */
  open() {
    if (!this.initialized) {
      this.init();
    }
    const event = new CustomEvent('customate-widget-open');
    window.dispatchEvent(event);
    trackEvent('widget_opened', { source: 'api' });
    return this;
  }

  /**
   * Close the widget programmatically
   */
  close() {
    if (!this.initialized) return this;
    
    const event = new CustomEvent('customate-widget-close');
    window.dispatchEvent(event);
    trackEvent('widget_closed', { source: 'api' });
    return this;
  }

  /**
   * Update widget configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    if (!this.initialized) {
      this.init(newConfig);
      return this;
    }

    const config = getConfig();
    const updatedConfig = mergeConfig(config, newConfig);
    setConfig(updatedConfig);

    // Re-render with new config
    this.root.render(
      <React.StrictMode>
        <ChatWidget />
      </React.StrictMode>
    );

    return this;
  }

  /**
   * Destroy the widget and remove it from DOM
   */
  destroy() {
    if (!this.initialized || !this.containerElement) return;
    
    this.root.unmount();
    this.containerElement.remove();
    this.containerElement = null;
    this.root = null;
    this.initialized = false;
    trackEvent('widget_destroyed');
    return this;
  }
}

// Create and export a singleton instance
const CustomateWidget = new Widget();

defaultConfig.apiKey = 'demo-api-key';

// Auto-initialize if configured
if (defaultConfig.autoInitialize) {
  window.addEventListener('DOMContentLoaded', () => {
    CustomateWidget.init();
  });
}

// Export the instance
export default CustomateWidget;