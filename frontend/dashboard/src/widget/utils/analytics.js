// frontend/dashboard/src/widget/utils/analytics.js
// Simplified version of analytics for dashboard testing

// Mock the tracking events
export const trackEvent = (eventName, properties = {}) => {
    console.log('TRACKING EVENT:', eventName, properties);
  };
  
  // Mock event queue processing
  export const processEventQueue = async () => {
    console.log('Processing event queue (mock)');
  };
  
  // Mock analytics initialization
  export const initAnalytics = () => {
    console.log('Analytics initialized (mock)');
  };