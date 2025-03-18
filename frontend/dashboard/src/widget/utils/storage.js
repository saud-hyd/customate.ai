// frontend/dashboard/src/widget/utils/storage.js
import { getConfig } from '../config';

// Storage keys with prefixes to avoid collisions
const KEYS = {
  SESSION_ID: '_customate_session_id',
  CHAT_HISTORY: '_customate_chat_history',
  USER_ID: '_customate_user_id',
  LAST_ACTIVITY: '_customate_last_activity',
  PREFERENCES: '_customate_preferences'
};

// Default session timeout - 30 minutes (in milliseconds)
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Get a unique storage key with API key as prefix
 * @param {string} key - Base key
 * @returns {string} - Prefixed key
 */
const getPrefixedKey = (key) => {
  const config = getConfig();
  return `${config.apiKey}${key}`;
};

/**
 * Check if local storage is available
 * @returns {boolean} - True if localStorage is available
 */
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Get a value from local storage
 * @param {string} key - Storage key
 * @returns {any} - Stored value or null
 */
const getFromStorage = (key) => {
  if (!isLocalStorageAvailable()) return null;
  
  const prefixedKey = getPrefixedKey(key);
  const value = localStorage.getItem(prefixedKey);
  
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch (e) {
    // If not JSON, return as is
    return value;
  }
};

/**
 * Set a value in local storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
const setInStorage = (key, value) => {
  if (!isLocalStorageAvailable()) return;
  
  const prefixedKey = getPrefixedKey(key);
  const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
  
  try {
    localStorage.setItem(prefixedKey, valueToStore);
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
};

/**
 * Remove a value from local storage
 * @param {string} key - Storage key
 */
const removeFromStorage = (key) => {
  if (!isLocalStorageAvailable()) return;
  
  const prefixedKey = getPrefixedKey(key);
  localStorage.removeItem(prefixedKey);
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = () => {
  setInStorage(KEYS.LAST_ACTIVITY, Date.now());
};

/**
 * Check if the current session has expired due to inactivity
 * @returns {boolean} - True if session has expired
 */
export const hasSessionExpired = () => {
  const lastActivity = getFromStorage(KEYS.LAST_ACTIVITY);
  if (!lastActivity) return true;
  
  const now = Date.now();
  const elapsed = now - lastActivity;
  
  // Get timeout from config or use default
  const config = getConfig();
  const sessionTimeoutMs = (config.sessionTimeout || 30) * 60 * 1000;
  
  return elapsed > sessionTimeoutMs;
};

/**
 * Get chat session ID from storage
 * @returns {string|null} - Session ID or null
 */
export const getSessionId = () => {
  // Check if session has expired
  if (hasSessionExpired()) {
    clearSession();
    return null;
  }
  
  updateLastActivity();
  return getFromStorage(KEYS.SESSION_ID);
};

/**
 * Save chat session ID to storage
 * @param {string} sessionId - Session ID to save
 */
export const saveSessionId = (sessionId) => {
  setInStorage(KEYS.SESSION_ID, sessionId);
  updateLastActivity();
};

/**
 * Remove session ID from storage
 */
export const clearSession = () => {
  removeFromStorage(KEYS.SESSION_ID);
  removeFromStorage(KEYS.CHAT_HISTORY);
  removeFromStorage(KEYS.LAST_ACTIVITY);
  console.log('Chat session cleared due to inactivity or manual reset');
};

/**
 * Get local chat history (used as fallback if API fails)
 * @returns {Array} - Chat history messages
 */
export const getLocalHistory = () => {
  // Don't return history if session has expired
  if (hasSessionExpired()) {
    clearSession();
    return [];
  }
  
  updateLastActivity();
  return getFromStorage(KEYS.CHAT_HISTORY) || [];
};

/**
 * Save chat history locally
 * @param {Array} messages - Chat history messages
 */
export const saveLocalHistory = (messages) => {
  // Limit to last 20 messages to conserve space
  const limitedHistory = messages.slice(-20);
  setInStorage(KEYS.CHAT_HISTORY, limitedHistory);
  updateLastActivity();
};

/**
 * Get user ID from storage
 * @returns {string|null} - User ID or null
 */
export const getUserId = () => {
  return getFromStorage(KEYS.USER_ID);
};

/**
 * Save user ID to storage
 * @param {string} userId - User ID to save
 */
export const saveUserId = (userId) => {
  setInStorage(KEYS.USER_ID, userId);
};

/**
 * Save user preferences
 * @param {Object} preferences - User preferences
 */
export const savePreferences = (preferences) => {
  setInStorage(KEYS.PREFERENCES, preferences);
};

/**
 * Get user preferences
 * @returns {Object} - User preferences
 */
export const getPreferences = () => {
  return getFromStorage(KEYS.PREFERENCES) || {};
};