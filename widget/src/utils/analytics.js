// widget/src/utils/analytics.js
import { getConfig } from '../config';

// Queue to store events when sending fails
let eventQueue = [];
const MAX_QUEUE_SIZE = 50;

/**
 * Track an event with the analytics service
 * @param {string} eventName - Name of the event
 * @param {Object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
  try {
    const config = getConfig();
    
    // Don't track events if analytics is disabled
    if (config.disableAnalytics) {
      return;
    }
    
    const eventData = {
      event: eventName,
      properties: {
        ...properties,
        widget_id: config.apiKey,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        user_id: config.userId || null,
        referrer: document.referrer || null,
        session_id: properties.session_id || null
      }
    };
    
    // Send event to backend
    sendEvent(eventData).catch((error) => {
      console.warn('Failed to send analytics event:', error);
      
      // Store in queue for retry
      if (eventQueue.length < MAX_QUEUE_SIZE) {
        eventQueue.push(eventData);
      }
    });
  } catch (error) {
    console.warn('Error in trackEvent:', error);
    // Fail silently - analytics should never break the main app
  }
};

/**
 * Send an event to the analytics API
 * @param {Object} eventData - Event data to send
 * @returns {Promise} - API response
 */
const sendEvent = async (eventData) => {
  try {
    const config = getConfig();
    const baseUrl = config.apiUrl || 'http://localhost:8000';
    
    const response = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Try to send queued events that failed previously
 */
export const processEventQueue = async () => {
  if (eventQueue.length === 0) return;
  
  const queueCopy = [...eventQueue];
  eventQueue = [];
  
  for (const event of queueCopy) {
    try {
      await sendEvent(event);
    } catch (error) {
      console.warn('Failed to send queued event:', error);
      
      // Put back in queue if still under max size
      if (eventQueue.length < MAX_QUEUE_SIZE) {
        eventQueue.push(event);
      }
    }
  }
};

/**
 * Initialize analytics
 */
export const initAnalytics = () => {
  try {
    // Try to process any queued events
    processEventQueue();
    
    // Set up periodic retry of failed events
    setInterval(processEventQueue, 60000); // Try every minute
    
    // Track page load
    trackEvent('widget_loaded');
    
    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        trackEvent('widget_visible');
      }
    });
  } catch (error) {
    console.warn('Error initializing analytics:', error);
    // Continue despite analytics errors
  }
};