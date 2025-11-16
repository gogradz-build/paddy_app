import { firestore } from '@/firebase/firebaseConfig';
import * as SQLite from "expo-sqlite";
import { doc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from "react";

const db = SQLite.openDatabaseSync("smartpaddy.db");

type User = {
  uid: string;
  name: string;
  email: string;
  district: string;
  city: string;
  userType: string;
  password: string; 
  isActive: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  // New optional fields
  gender?: 'male' | 'female' | 'other' | '';
  birthday?: string;
  phone?: string;
  userName?: string;
};

type UserRow = {
  uid: string;
  name: string;
  email: string;
  district: string;
  city: string;
  userType: string;
  password: string;
  isActive: number; 
  profileComplete: number; 
  createdAt: string;
  updatedAt: string;
  gender?: string;
  birthday?: string;
  phone?: string;
  userName?: string;
};

type UserContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  saveUserToDB: (u: User) => Promise<void>;
  getUserFromDB: () => Promise<void>;
  clearUser: () => Promise<void>;
  validateUserCredentials: (email: string, password: string) => Promise<User | null>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  syncUserWithFirebase: (userData: User) => Promise<void>;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize database and load user on mount
  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // First, create table if it doesn't exist (for fresh installs)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          name TEXT,
          email TEXT,
          district TEXT,
          city TEXT,
          userType TEXT,
          password TEXT,
          isActive INTEGER,
          profileComplete INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          gender TEXT,
          birthday TEXT,
          phone TEXT,
          userName TEXT
        );
      `);
      
      // Migrate existing database to include new fields
      await migrateDatabase();
      
      console.log(" Database table created/verified with all fields");
      
      // Load existing user
      await getUserFromDB();
    } catch (error) {
      console.error(" Database initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const migrateDatabase = async () => {
    try {
      // Get current table structure
      const tableInfo = await db.getAllAsync("PRAGMA table_info(users)") as any[];
      const existingColumns = tableInfo.map((column: any) => column.name);
      
      // Define all required columns
      const requiredColumns = [
        { name: 'password', type: 'TEXT', defaultValue: "''" },
        { name: 'gender', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'birthday', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'phone', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'userName', type: 'TEXT', defaultValue: 'NULL' }
      ];
      
      // Add missing columns
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          console.log(` Adding ${column.name} column to existing table...`);
          await db.execAsync(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue};`);
          console.log(` ${column.name} column added successfully`);
        }
      }
      
      console.log(" Database migration completed");
    } catch (error) {
      console.error("Database migration error:", error);
      throw error;
    }
  };

  const saveUserToDB = async (u: User): Promise<void> => {
    try {
      const result = await db.runAsync(
        `INSERT OR REPLACE INTO users 
         (uid, name, email, district, city, userType, password, isActive, profileComplete, createdAt, updatedAt, gender, birthday, phone, userName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.uid,
          u.name,
          u.email,
          u.district,
          u.city,
          u.userType,
          u.password,
          u.isActive ? 1 : 0,
          u.profileComplete ? 1 : 0,
          u.createdAt,
          u.updatedAt,
          u.gender || null,
          u.birthday || null,
          u.phone || null,
          u.userName || null,
        ]
      );

      if (result.changes > 0) {
        setUser(u);
        console.log("User saved successfully to SQLite with all fields");
      }
    } catch (error) {
      console.error("Error saving user to SQLite:", error);
      throw error;
    }
  };

  const getUserFromDB = async (): Promise<void> => {
    try {
      const result = await db.getFirstAsync<UserRow>(
        "SELECT * FROM users LIMIT 1"
      );

      if (result) {
        // Convert database row to User type
        const userData: User = {
          uid: result.uid,
          name: result.name,
          email: result.email,
          district: result.district,
          city: result.city,
          userType: result.userType,
          password: result.password || '',
          isActive: result.isActive === 1,
          profileComplete: result.profileComplete === 1,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          gender: (result.gender as 'male' | 'female' | 'other' | '') || '',
          birthday: result.birthday || '',
          phone: result.phone || '',
          userName: result.userName || '',
        };
        
        setUser(userData);
        console.log("User loaded from SQLite:", { ...userData, password: "***hidden***" });
      } else {
        console.log("ℹNo user found in SQLite");
        setUser(null);
      }
    } catch (error) {
      console.error(" Error fetching user from SQLite:", error);
      setUser(null);
    }
  };

  // Validate user credentials for offline login
  const validateUserCredentials = async (email: string, password: string): Promise<User | null> => {
    try {
      const result = await db.getFirstAsync<UserRow>(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email.toLowerCase().trim(), password]
      );

      if (result) {
        // Convert database row to User type
        const userData: User = {
          uid: result.uid,
          name: result.name,
          email: result.email,
          district: result.district,
          city: result.city,
          userType: result.userType,
          password: result.password || '',
          isActive: result.isActive === 1,
          profileComplete: result.profileComplete === 1,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          gender: (result.gender as 'male' | 'female' | 'other' | '') || '',
          birthday: result.birthday || '',
          phone: result.phone || '',
          userName: result.userName || '',
        };
        
        console.log(" User credentials validated offline");
        return userData;
      } else {
        console.log(" Invalid credentials for offline login");
        return null;
      }
    } catch (error) {
      console.error(" Error validating credentials:", error);
      return null;
    }
  };

  // Update user profile in both Firebase and local database
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const updatedUser: User = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update Firebase first
      await syncUserWithFirebase(updatedUser);

      // 2. Update local database
      await saveUserToDB(updatedUser);

      console.log(" User profile updated in both Firebase and local database");
    } catch (error) {
      console.error(" Error updating user profile:", error);
      throw error;
    }
  };

  // Sync user data with Firebase (without password for security)
  const syncUserWithFirebase = async (userData: User): Promise<void> => {
    try {
      const userRef = doc(firestore, 'users', userData.uid);
      
      // Prepare data for Firebase (exclude password)
      const firebaseData = {
        name: userData.name,
        email: userData.email,
        district: userData.district,
        city: userData.city,
        userType: userData.userType,
        isActive: userData.isActive,
        profileComplete: userData.profileComplete,
        updatedAt: userData.updatedAt,
        ...(userData.gender && { gender: userData.gender }),
        ...(userData.birthday && { birthday: userData.birthday }),
        ...(userData.phone && { phone: userData.phone }),
        ...(userData.userName && { userName: userData.userName }),
      };

      await updateDoc(userRef, firebaseData);
      console.log(" User data synced with Firebase");
    } catch (error) {
      console.error(" Error syncing user data with Firebase:", error);
      throw error;
    }
  };

  // Clear user data
  const clearUser = async (): Promise<void> => {
    try {
      await db.runAsync("DELETE FROM users");
      setUser(null);
      console.log(" User data cleared from SQLite");
    } catch (error) {
      console.error(" Error clearing user data:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        setUser, 
        saveUserToDB, 
        getUserFromDB, 
        clearUser,
        validateUserCredentials,
        updateUserProfile,
        syncUserWithFirebase,
        loading 
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};