// src/utils/storage.js
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from './constants';

/**
 * Local Storage utilities
 */
class LocalStorage {
  /**
   * Set item in localStorage with error handling
   */
  static setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error setting localStorage item:', error);
      return false;
    }
  }

  /**
   * Get item from localStorage with error handling
   */
  static getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing localStorage item:', error);
      return false;
    }
  }

  /**
   * Clear all localStorage
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Get all localStorage keys
   */
  static getAllKeys() {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Session Storage utilities
 */
class SessionStorage {
  /**
   * Set item in sessionStorage with error handling
   */
  static setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error setting sessionStorage item:', error);
      return false;
    }
  }

  /**
   * Get item from sessionStorage with error handling
   */
  static getItem(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error getting sessionStorage item:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from sessionStorage
   */
  static removeItem(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing sessionStorage item:', error);
      return false;
    }
  }

  /**
   * Clear all sessionStorage
   */
  static clear() {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
      return false;
    }
  }

  /**
   * Check if sessionStorage is available
   */
  static isAvailable() {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Application-specific storage utilities
 */
export class AppStorage {
  // Authentication
  static setToken(token) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
  }

  static getToken() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
  }

  static removeToken() {
    return LocalStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
  }

  static setRefreshToken(token) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  static getRefreshToken() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
  }

  static removeRefreshToken() {
    return LocalStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
  }

  // User data
  static setUser(user) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.USER, user);
  }

  static getUser() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.USER);
  }

  static removeUser() {
    return LocalStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
  }

  // Theme
  static setTheme(theme) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
  }

  static getTheme() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.THEME, 'light');
  }

  // Language
  static setLanguage(language) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGE, language);
  }

  static getLanguage() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGE, 'en');
  }

  // UI preferences
  static setSidebarCollapsed(collapsed) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  }

  static getSidebarCollapsed() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  }

  static setTourCompleted(completed) {
    return LocalStorage.setItem(LOCAL_STORAGE_KEYS.TOUR_COMPLETED, completed);
  }

  static getTourCompleted() {
    return LocalStorage.getItem(LOCAL_STORAGE_KEYS.TOUR_COMPLETED, false);
  }

  // Session data
  static setRedirectUrl(url) {
    return SessionStorage.setItem(SESSION_STORAGE_KEYS.REDIRECT_URL, url);
  }

  static getRedirectUrl() {
    return SessionStorage.getItem(SESSION_STORAGE_KEYS.REDIRECT_URL);
  }

  static removeRedirectUrl() {
    return SessionStorage.removeItem(SESSION_STORAGE_KEYS.REDIRECT_URL);
  }

  static setFormData(formId, data) {
    const allFormData = SessionStorage.getItem(SESSION_STORAGE_KEYS.FORM_DATA, {});
    allFormData[formId] = data;
    return SessionStorage.setItem(SESSION_STORAGE_KEYS.FORM_DATA, allFormData);
  }

  static getFormData(formId) {
    const allFormData = SessionStorage.getItem(SESSION_STORAGE_KEYS.FORM_DATA, {});
    return allFormData[formId] || null;
  }

  static removeFormData(formId) {
    const allFormData = SessionStorage.getItem(SESSION_STORAGE_KEYS.FORM_DATA, {});
    delete allFormData[formId];
    return SessionStorage.setItem(SESSION_STORAGE_KEYS.FORM_DATA, allFormData);
  }

  static setSearchFilters(page, filters) {
    const allFilters = SessionStorage.getItem(SESSION_STORAGE_KEYS.SEARCH_FILTERS, {});
    allFilters[page] = filters;
    return SessionStorage.setItem(SESSION_STORAGE_KEYS.SEARCH_FILTERS, allFilters);
  }

  static getSearchFilters(page) {
    const allFilters = SessionStorage.getItem(SESSION_STORAGE_KEYS.SEARCH_FILTERS, {});
    return allFilters[page] || null;
  }

  // Clear all app data
  static clearAllData() {
    const success1 = this.removeToken();
    const success2 = this.removeRefreshToken();
    const success3 = this.removeUser();
    const success4 = SessionStorage.clear();
    
    return success1 && success2 && success3 && success4;
  }

  // Clear session data only
  static clearSessionData() {
    return SessionStorage.clear();
  }
}

/**
 * Secure storage for sensitive data (using encryption if needed)
 */
export class SecureStorage {
  static encrypt(data) {
    // Simple base64 encoding - replace with proper encryption in production
    try {
      return btoa(JSON.stringify(data));
    } catch {
      return null;
    }
  }

  static decrypt(encryptedData) {
    // Simple base64 decoding - replace with proper decryption in production
    try {
      return JSON.parse(atob(encryptedData));
    } catch {
      return null;
    }
  }

  static setSecureItem(key, value) {
    const encrypted = this.encrypt(value);
    if (encrypted) {
      return LocalStorage.setItem(`secure_${key}`, encrypted);
    }
    return false;
  }

  static getSecureItem(key, defaultValue = null) {
    const encrypted = LocalStorage.getItem(`secure_${key}`);
    if (encrypted) {
      const decrypted = this.decrypt(encrypted);
      return decrypted !== null ? decrypted : defaultValue;
    }
    return defaultValue;
  }

  static removeSecureItem(key) {
    return LocalStorage.removeItem(`secure_${key}`);
  }
}

/**
 * Storage event listener for cross-tab communication
 */
export class StorageEventManager {
  static listeners = new Map();

  static addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Add actual storage event listener
    const storageListener = (event) => {
      if (event.key === key) {
        callback(event.newValue, event.oldValue);
      }
    };

    window.addEventListener('storage', storageListener);
    
    // Store reference for cleanup
    callback._storageListener = storageListener;
  }

  static removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
      
      // Remove actual storage event listener
      if (callback._storageListener) {
        window.removeEventListener('storage', callback._storageListener);
        delete callback._storageListener;
      }
    }
  }

  static removeAllListeners(key) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      callbacks.forEach(callback => {
        if (callback._storageListener) {
          window.removeEventListener('storage', callback._storageListener);
          delete callback._storageListener;
        }
      });
      this.listeners.delete(key);
    }
  }

  static clearAllListeners() {
    this.listeners.forEach((callbacks, key) => {
      this.removeAllListeners(key);
    });
  }
}

/**
 * Storage quota management
 */
export class StorageQuota {
  static async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate();
      } catch {
        return null;
      }
    }
    return null;
  }

  static async getUsagePercentage() {
    const estimate = await this.getStorageEstimate();
    if (estimate && estimate.quota && estimate.usage) {
      return Math.round((estimate.usage / estimate.quota) * 100);
    }
    return null;
  }

  static getLocalStorageSize() {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  static getSessionStorageSize() {
    let total = 0;
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        total += sessionStorage[key].length + key.length;
      }
    }
    return total;
  }

  static isStorageQuotaExceeded(error) {
    return error && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
}

// Export main classes
export { LocalStorage, SessionStorage };

// Export default storage instance
export const storage = AppStorage;

export default {
  LocalStorage,
  SessionStorage,
  AppStorage,
  SecureStorage,
  StorageEventManager,
  StorageQuota,
  storage
};
