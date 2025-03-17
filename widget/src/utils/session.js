import { getConfig } from '../config';
import { saveSessionId, getSessionId, saveUserId, getUserId, updateLastVisit } from './storage';
import { trackEvent } from './analytics';
import { v4 as uuidv4 } from 'uuid';  // You would need to add this dependency

/**
 * Generate a UUID for user identification
 * @returns {string} - Generated UUID
 */
const generateUUID = () => {
  // If uuid package is not available, fallback to a simpler method
  if (typeof uuidv4 === 'function') {
    return uuidv4();
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Initialize or retrieve session information
 * @param {Object} config - Widget configuration
 */
export const initializeSession = (config) => {
  // Check for existing session
  let sessionId = getSessionId();
  if (!sessionId) {
    // Generate new session ID
    sessionId = generateUUID();
    saveSessionId(sessionId);
    trackEvent('session_created', { session_id: sessionId });
  }
  
  // Handle user identification
  let userId = config.userId || getUserId();
  if (!userId) {
    // Generate anonymous user ID if not provided
    userId = generateUUID();
    saveUserId(userId);
  }
  
  // Update last visit timestamp
  updateLastVisit();
  
  return {
    sessionId,
    userId
  };
};

/**
 * Reset the current session and create a new one
 * @returns {string} - New session ID
 */
export const resetSession = () => {
  const newSessionId = generateUUID();
  saveSessionId(newSessionId);
  trackEvent('session_reset', { session_id: newSessionId });
  return newSessionId;
};

/**
 * Get the current session information
 * @returns {Object} - Session information
 */
export const getSessionInfo = () => {
  const sessionId = getSessionId();
  const userId = getUserId();
  const config = getConfig();
  
  return {
    sessionId,
    userId: config.userId || userId,
    isNewSession: !sessionId
  };
};