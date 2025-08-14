// Gmail OAuth Manager - Singleton to prevent duplicate token exchanges
class GmailOAuthManager {
  constructor() {
    this.completedCodes = new Set();
    this.activePromises = new Map(); // Track active promises by code
    this.processingCodes = new Set(); // Immediate synchronous lock
    this.globalLock = false; // Global lock to prevent any concurrent OAuth processing
    this.activeMessageHandlers = new Set(); // Track active message handlers
    this.masterMessageHandler = null; // Single master message handler
  }


  // Process token exchange with duplicate prevention using promise deduplication
  async processTokenExchange(code, state) {
    const timestamp = new Date().toISOString();
    console.log(`[OAuth Manager] ${timestamp} Processing token exchange for code: ${code.substring(0, 10)}...`);
    console.log(`[OAuth Manager] ${timestamp} Current state:`, this.getState());
    
    // Ultra-aggressive global window protection - prevents ALL OAuth across the entire application
    const globalKey = `oauth_processing_${code}`;
    if (window[globalKey]) {
      console.warn(`[OAuth Manager] ${timestamp} ULTRA BLOCK: Window-level protection active for code: ${code.substring(0, 10)}...`);
      throw new Error('This OAuth code has already been processed at window level');
    }
    window[globalKey] = timestamp;
    
    // Global lock check - prevent any OAuth processing while another is active
    if (this.globalLock) {
      console.warn(`[OAuth Manager] Global lock active, blocking duplicate OAuth attempt`);
      throw new Error('Another OAuth process is already in progress');
    }
    
    // Immediate synchronous check to prevent race conditions
    if (this.processingCodes.has(code)) {
      console.warn(`[OAuth Manager] Code already being processed synchronously: ${code.substring(0, 10)}...`);
      throw new Error('This authorization code is already being processed');
    }
    
    // If there's already an active promise for this code, return it
    if (this.activePromises.has(code)) {
      console.log(`[OAuth Manager] Returning existing promise for code: ${code.substring(0, 10)}...`);
      return this.activePromises.get(code);
    }

    // Check if this code has already been completed
    if (this.completedCodes.has(code)) {
      console.warn(`[OAuth Manager] Code already completed: ${code.substring(0, 10)}...`);
      throw new Error('This authorization code has already been used');
    }

    console.log(`[OAuth Manager] Starting new token exchange for code: ${code.substring(0, 10)}...`);

    // Set global lock and mark as immediately processing
    this.globalLock = true;
    this.processingCodes.add(code);

    // Create and store the promise
    const promise = this.performTokenExchange(code, state);
    this.activePromises.set(code, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up the active promise, processing lock, and global lock
      this.activePromises.delete(code);
      this.processingCodes.delete(code);
      this.globalLock = false;
    }
  }

  // Perform the actual token exchange
  async performTokenExchange(code, state) {
    try {
      const response = await fetch('/api/gmail/oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: code,
          state: state
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[OAuth Manager] Token exchange failed: ${errorData.detail}`);
        throw new Error(errorData.detail || 'Failed to exchange authorization code for tokens');
      }

      const tokenData = await response.json();
      console.log(`[OAuth Manager] Token exchange successful for code: ${code.substring(0, 10)}...`);
      
      // Mark as completed
      this.completedCodes.add(code);
      
      // Clean up old completed codes
      if (this.completedCodes.size > 100) {
        const codesArray = Array.from(this.completedCodes);
        const toRemove = codesArray.slice(0, codesArray.length - 50);
        toRemove.forEach(c => this.completedCodes.delete(c));
      }
      
      return tokenData;
      
    } catch (error) {
      console.error(`[OAuth Manager] Token exchange error for code: ${code.substring(0, 10)}...`, error);
      // Mark as completed even on error to prevent retries of the same code
      this.completedCodes.add(code);
      // Clean up processing lock and global lock on error
      this.processingCodes.delete(code);
      this.globalLock = false;
      // Clean up window-level protection
      const globalKey = `oauth_processing_${code}`;
      delete window[globalKey];
      throw error;
    }
  }
  
  // Debug method to check current state
  getState() {
    return {
      completedCodesCount: this.completedCodes.size,
      activePromisesCount: this.activePromises.size,
      processingCodesCount: this.processingCodes.size,
      globalLock: this.globalLock,
      completedCodes: Array.from(this.completedCodes).map(code => code.substring(0, 10) + '...'),
      activeCodes: Array.from(this.activePromises.keys()).map(code => code.substring(0, 10) + '...'),
      processingCodes: Array.from(this.processingCodes).map(code => code.substring(0, 10) + '...')
    };
  }
  
  // Reset method for debugging
  reset() {
    console.log('[OAuth Manager] Resetting all state');
    this.completedCodes.clear();
    this.activePromises.clear();
    this.processingCodes.clear();
    this.globalLock = false;
    this.activeMessageHandlers.clear();
    this.masterMessageHandler = null;
  }
  
  // Register a message handler and ensure only one is active
  registerMessageHandler(handlerName, handler) {
    console.log(`[OAuth Manager] Registering message handler: ${handlerName}`);
    
    // If there's already an active handler, ignore this registration
    if (this.masterMessageHandler) {
      console.warn(`[OAuth Manager] Message handler already active: ${this.masterMessageHandler.name}, ignoring ${handlerName}`);
      return false;
    }
    
    // Set this as the master handler
    this.masterMessageHandler = { name: handlerName, handler };
    this.activeMessageHandlers.add(handlerName);
    
    // Add the actual event listener
    window.addEventListener('message', handler);
    console.log(`[OAuth Manager] Master message handler set: ${handlerName}`);
    return true;
  }
  
  // Unregister a message handler
  unregisterMessageHandler(handlerName, handler) {
    console.log(`[OAuth Manager] Unregistering message handler: ${handlerName}`);
    
    // Remove the event listener
    window.removeEventListener('message', handler);
    
    // If this was the master handler, clear it
    if (this.masterMessageHandler && this.masterMessageHandler.name === handlerName) {
      this.masterMessageHandler = null;
      console.log(`[OAuth Manager] Master message handler cleared: ${handlerName}`);
    }
    
    this.activeMessageHandlers.delete(handlerName);
  }
}

// Export singleton instance
const gmailOAuthManager = new GmailOAuthManager();

// Make available globally for debugging
window.gmailOAuthManager = gmailOAuthManager;

export default gmailOAuthManager;