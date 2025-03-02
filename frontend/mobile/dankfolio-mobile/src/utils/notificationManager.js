/**
 * Notification Manager for Dankfolio
 * 
 * Handles local notifications, alerts, and future push notifications
 * for trade confirmations and other app events.
 */

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'dankfolio_notification_settings',
  NOTIFICATION_HISTORY: 'dankfolio_notification_history',
};

// Default notification settings
const DEFAULT_SETTINGS = {
  tradeSubmitted: true,
  tradeConfirmed: true,
  tradeFailed: true,
  priceAlerts: true,
  networkAlerts: true,
  marketUpdates: false,
  sound: true,
  vibration: true,
};

/**
 * Main notification manager class
 */
class NotificationManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.notifications = [];
    this.initialized = false;
    
    // Initialize settings
    this._initSettings();
  }
  
  /**
   * Initialize notification settings from storage
   */
  async _initSettings() {
    try {
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
      
      const storedHistory = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      if (storedHistory) {
        this.notifications = JSON.parse(storedHistory);
      }
      
      this.initialized = true;
      console.log('✅ Notification manager initialized with settings:', this.settings);
    } catch (error) {
      console.error('❌ Failed to initialize notification settings:', error);
      // Fall back to defaults
      this.settings = { ...DEFAULT_SETTINGS };
      this.initialized = true;
    }
  }
  
  /**
   * Save notification settings to storage
   */
  async saveSettings(settings) {
    try {
      const newSettings = { ...this.settings, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(newSettings));
      this.settings = newSettings;
      console.log('✅ Notification settings saved:', newSettings);
      return true;
    } catch (error) {
      console.error('❌ Failed to save notification settings:', error);
      return false;
    }
  }
  
  /**
   * Get current notification settings
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Add a notification to history
   */
  async _addToHistory(notification) {
    try {
      // Add notification to in-memory array
      this.notifications.unshift({
        ...notification,
        id: Date.now().toString(),
        read: false,
        timestamp: new Date().toISOString(),
      });
      
      // Limit to 50 notifications
      if (this.notifications.length > 50) {
        this.notifications = this.notifications.slice(0, 50);
      }
      
      // Save to storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY, 
        JSON.stringify(this.notifications)
      );
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save notification history:', error);
      return false;
    }
  }
  
  /**
   * Get notification history
   */
  getNotificationHistory() {
    return [...this.notifications];
  }
  
  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds) {
    try {
      let updated = false;
      
      // Update notifications in memory
      this.notifications = this.notifications.map(notification => {
        if (notificationIds.includes(notification.id) && !notification.read) {
          updated = true;
          return { ...notification, read: true };
        }
        return notification;
      });
      
      // If any were updated, save to storage
      if (updated) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_HISTORY, 
          JSON.stringify(this.notifications)
        );
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to mark notifications as read:', error);
      return false;
    }
  }
  
  /**
   * Clear notification history
   */
  async clearHistory() {
    try {
      this.notifications = [];
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear notification history:', error);
      return false;
    }
  }
  
  /**
   * Show a notification for a trade submission
   */
  async tradeSubmitted(tradeDetails) {
    if (!this.settings.tradeSubmitted) return false;
    
    const notification = {
      type: 'tradeSubmitted',
      title: '🚀 Trade Submitted',
      message: `Your trade of ${tradeDetails.amount} ${tradeDetails.fromSymbol} to ${tradeDetails.toSymbol} has been submitted.`,
      data: tradeDetails,
    };
    
    // Add to history
    await this._addToHistory(notification);
    
    // Show alert if in app
    if (tradeDetails.showAlert) {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
    
    return true;
  }
  
  /**
   * Show a notification for a trade confirmation
   */
  async tradeConfirmed(tradeDetails) {
    if (!this.settings.tradeConfirmed) return false;
    
    const notification = {
      type: 'tradeConfirmed',
      title: '✅ Trade Confirmed',
      message: `Your trade of ${tradeDetails.amount} ${tradeDetails.fromSymbol} to ${tradeDetails.toSymbol} has been confirmed on the blockchain.`,
      data: tradeDetails,
    };
    
    // Add to history
    await this._addToHistory(notification);
    
    // Show alert if in app
    if (tradeDetails.showAlert) {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
    
    return true;
  }
  
  /**
   * Show a notification for a trade failure
   */
  async tradeFailed(tradeDetails) {
    if (!this.settings.tradeFailed) return false;
    
    const notification = {
      type: 'tradeFailed',
      title: '❌ Trade Failed',
      message: `Your trade of ${tradeDetails.amount} ${tradeDetails.fromSymbol} to ${tradeDetails.toSymbol} has failed: ${tradeDetails.errorMessage || 'Unknown error'}`,
      data: tradeDetails,
    };
    
    // Add to history
    await this._addToHistory(notification);
    
    // Show alert if in app
    if (tradeDetails.showAlert) {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
    
    return true;
  }
  
  /**
   * Show a network status alert
   */
  async networkAlert(status) {
    if (!this.settings.networkAlerts) return false;
    
    let title = '❓ Network Status Changed';
    let message = 'The Solana network status has changed.';
    
    if (status === 'degraded') {
      title = '⚠️ Network Issues Detected';
      message = 'The Solana network is experiencing issues. Trades may be delayed or fail. Please use caution when trading.';
    } else if (status === 'healthy') {
      title = '✅ Network Healthy';
      message = 'The Solana network is operating normally.';
    }
    
    const notification = {
      type: 'networkAlert',
      title,
      message,
      data: { status, timestamp: new Date().toISOString() },
    };
    
    // Add to history
    await this._addToHistory(notification);
    
    return true;
  }
  
  /**
   * Show a price alert notification
   */
  async priceAlert(coinDetails) {
    if (!this.settings.priceAlerts) return false;
    
    const notification = {
      type: 'priceAlert',
      title: '💰 Price Alert',
      message: `${coinDetails.symbol} has ${coinDetails.direction === 'up' ? 'increased' : 'decreased'} by ${coinDetails.percentage}% in the last 24 hours.`,
      data: coinDetails,
    };
    
    // Add to history
    await this._addToHistory(notification);
    
    // Show alert if in app
    if (coinDetails.showAlert) {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
    
    return true;
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager; 