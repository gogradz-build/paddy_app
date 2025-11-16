// utils/errorHandling.ts
import { FirebaseError } from 'firebase/app';
import { Alert } from 'react-native';

/**
 * Centralized error handler for consistent error management
 */
export class ErrorHandler {
  /**
   * Handle Firebase errors with user-friendly messages
   */
  static handleFirebaseError(error: unknown, context: string = 'Operation'): string {
    console.error(`${context} error:`, error);

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'You don\'t have permission to perform this action';
        case 'not-found':
          return 'The requested data was not found';
        case 'already-exists':
          return 'This item already exists';
        case 'resource-exhausted':
          return 'Too many requests. Please try again later';
        case 'unauthenticated':
          return 'Please log in to continue';
        case 'unavailable':
          return 'Service temporarily unavailable. Please check your connection';
        case 'deadline-exceeded':
          return 'Request timed out. Please try again';
        default:
          return `${context} failed. Please try again`;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return `${context} failed. Please try again`;
  }

  /**
   * Show alert with error message
   */
  static showError(error: unknown, context: string = 'Error', onDismiss?: () => void) {
    const message = this.handleFirebaseError(error, context);
    
    Alert.alert(
      context,
      message,
      [
        {
          text: 'OK',
          onPress: onDismiss
        }
      ]
    );
  }

  /**
   * Validate user data structure
   */
  static validateUserData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const requiredFields = ['uid', 'email', 'userType'];
    return requiredFields.every(field => field in data && data[field]);
  }

  /**
   * Safe JSON parse with fallback
   */
  static safeJSONParse<T>(jsonString: string | null, fallback: T): T {
    if (!jsonString) return fallback;
    
    try {
      const parsed = JSON.parse(jsonString);
      return parsed ?? fallback;
    } catch (error) {
      console.error('JSON parse error:', error);
      return fallback;
    }
  }

  /**
   * Safe number conversion
   */
  static safeNumber(value: any, fallback: number = 0): number {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  }

  /**
   * Safe string conversion
   */
  static safeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) return fallback;
    return String(value);
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`Retry attempt ${i + 1}/${maxRetries} failed:`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError!;
  }
}

/**
 * Safe navigation wrapper for React Navigation
 */
export class NavigationHandler {
  static safeNavigate(
    router: any,
    path: string,
    params?: any,
    onError?: (error: Error) => void
  ) {
    try {
      if (params) {
        router.push({ pathname: path, params });
      } else {
        router.push(path);
      }
    } catch (error) {
      console.error(`Navigation error to ${path}:`, error);
      if (onError) {
        onError(error as Error);
      } else {
        Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
      }
    }
  }

  static safeGoBack(router: any, onError?: (error: Error) => void) {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Navigation back error:', error);
      if (onError) {
        onError(error as Error);
      } else {
        Alert.alert('Navigation Error', 'Unable to go back.');
      }
    }
  }
}

/**
 * Safe AsyncStorage operations
 */
export class StorageHandler {
  static async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const value = await AsyncStorage.getItem(key);
      
      if (!value) return fallback;
      
      return ErrorHandler.safeJSONParse(value, fallback);
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return fallback;
    }
  }

  static async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  }

  static async removeItem(key: string): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  }

  static async clear(): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

/**
 * Safe Firestore operations
 */
export class FirestoreHandler {
  /**
   * Safe document data mapping
   */
  static mapDocData<T>(doc: any, defaults: Partial<T> = {}): T {
    try {
      if (!doc || !doc.exists()) {
        return { id: '', ...defaults } as T;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...defaults,
        ...data,
      } as T;
    } catch (error) {
      console.error('Error mapping document data:', error);
      return { id: '', ...defaults } as T;
    }
  }

  /**
   * Safe query snapshot mapping
   */
  static mapQuerySnapshot<T>(
    snapshot: any,
    defaults: Partial<T> = {}
  ): T[] {
    try {
      if (!snapshot || !snapshot.docs) {
        return [];
      }

      return snapshot.docs
        .map((doc: any) => this.mapDocData<T>(doc, defaults))
        .filter((item: any) => item.id !== '');
    } catch (error) {
      console.error('Error mapping query snapshot:', error);
      return [];
    }
  }

  /**
   * Safe date formatting
   */
  static formatTimestamp(timestamp: any, fallback: string = 'N/A'): string {
    try {
      if (!timestamp) return fallback;

      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      if (isNaN(date.getTime())) return fallback;

      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).replace(/\s/g, '-');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return fallback;
    }
  }
}

/**
 * Image loading error handler
 */
export class ImageHandler {
  static getImageSource(images: Record<string, any>, name: string, fallback: any) {
    try {
      if (!name) return fallback;
      
      const lower = name.toLowerCase().trim();
      
      // Check for combined names first
      if (lower.includes('keeri') && lower.includes('samba')) {
        return images.keerisamba || fallback;
      }
      
      // Check individual names
      for (const [key, value] of Object.entries(images)) {
        if (lower.includes(key.toLowerCase())) {
          return value;
        }
      }
      
      return fallback;
    } catch (error) {
      console.error('Error getting image source:', error);
      return fallback;
    }
  }

  static onImageError(error: any, imageName: string = 'Image') {
    console.error(`${imageName} loading error:`, error);
  }
}

/**
 * Form validation helper
 */
export class ValidationHandler {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  static isValidPassword(password: string): boolean {
    return password.length >= 6;
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

/**
 * Network connectivity checker
 */
export class NetworkHandler {
  static async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async handleOffline(callback: () => Promise<void>) {
    const isOnline = await this.checkConnectivity();
    
    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    await callback();
  }
}

export default {
  ErrorHandler,
  NavigationHandler,
  StorageHandler,
  FirestoreHandler,
  ImageHandler,
  ValidationHandler,
  NetworkHandler,
};