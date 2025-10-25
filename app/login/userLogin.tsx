import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useUser } from '@/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestore } from '../../firebase/firebaseConfig';

const UserLogin: React.FC = () => {
  const router = useRouter();
  const { validateUserCredentials, setUser, saveUserToDB } = useUser();
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [errorView, setErrorView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'checking' | 'online' | 'offline'>('checking');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.isConnected || false;
    } catch (error) {
      console.log('Network check failed, assuming offline');
      return false;
    }
  };

  const handleOnlineLogin = async (): Promise<boolean> => {
    try {
      console.log('Attempting online login...');
      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      console.log('Firebase auth successful:', firebaseUser.uid);

      // Get user data from Firestore
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('User data not found. Please contact support.');
        setErrorView(true);
        return false;
      }

      const userData = userDoc.data();
      console.log('User data retrieved from Firestore');

      // Create complete user object for SQLite (including password for offline support)
      const completeUserData = {
        uid: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
        district: userData.district,
        city: userData.city,
        userType: userData.userType,
        password: password, // Save password for offline use
        isActive: userData.isActive,
        profileComplete: userData.profileComplete,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to UserContext and SQLite
      await saveUserToDB(completeUserData);
      setUser(completeUserData);

      // Also save to AsyncStorage for compatibility
      await AsyncStorage.setItem('userData', JSON.stringify(completeUserData));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userType', userData.userType);

      console.log('✅ Online login successful - User data saved to all storages');
      return true;

    } catch (error: any) {
      console.log('Online login failed:', error.code);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Login failed. Please try again.';
      
      if (error && error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Trying offline login...';
            break;
          default:
            errorMessage = 'Invalid email or password.';
        }
      }

      // If it's a network error, try offline login
      if (error.code === 'auth/network-request-failed') {
        console.log('Network error detected, attempting offline login...');
        return await handleOfflineLogin();
      } else {
        setError(errorMessage);
        setErrorView(true);
        return false;
      }
    }
  };

  const handleOfflineLogin = async (): Promise<boolean> => {
    try {
      console.log('Attempting offline login...');
      setLoginMode('offline');
      
      const userData = await validateUserCredentials(email.trim().toLowerCase(), password);
      
      if (userData) {
        setUser(userData);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('userType', userData.userType);
        
        console.log('✅ Offline login successful');
        return true;
      } else {
        setError('Invalid email or password. Please check your credentials.');
        setErrorView(true);
        return false;
      }
    } catch (error) {
      console.error('Offline login failed:', error);
      setError('Login failed. Please check your credentials.');
      setErrorView(true);
      return false;
    }
  };

  const handleLogin = async (): Promise<void> => {
    console.log('Login process started');
    
    setError('');
    setErrorView(false);
    setLoginMode('checking');

    // Validation
    if (!email.trim() || !password) {
      setError('Please fill all fields');
      setErrorView(true);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setErrorView(true);
      return;
    }

    setIsLoading(true);

    try {
      // Check network connectivity
      const isOnline = await checkNetworkConnection();
      
      let loginSuccessful = false;

      if (isOnline) {
        setLoginMode('online');
        loginSuccessful = await handleOnlineLogin();
      } else {
        setLoginMode('offline');
        loginSuccessful = await handleOfflineLogin();
      }

      if (loginSuccessful) {
        // Clear form
        setEmail('');
        setPassword('');
        Keyboard.dismiss();

        // Get user type from context
        const currentUser = await validateUserCredentials(email.trim().toLowerCase(), password);
        const userType = currentUser?.userType || 'farmer';
        
        const modeText = loginMode === 'offline' ? ' (Offline Mode)' : '';
        
        Alert.alert(
          'Success!', 
          `Login successful!${modeText}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate based on user type
                switch (userType) {
                  case 'farmer':
                    router.replace('/(farmer)/dashboard' as any);
                    break;
                  case 'buyer':
                  case 'vendor':
                    router.replace('/(vendor)/dashboard' as any);
                    break;
                  case 'admin':
                    router.replace('/(admin)/dashboard' as any);
                    break;
                  default:
                    router.replace('/(farmer)/dashboard' as any);
                }
              },
            },
          ]
        );
      }

    } catch (error: any) {
      console.error('Login process error:', error);
      setError('An unexpected error occurred. Please try again.');
      setErrorView(true);
    } finally {
      setIsLoading(false);
      setLoginMode('checking');
    }
  };

  const handleBack = (): void => {
    router.back();
  };

  const getLoginButtonText = (): string => {
    if (!isLoading) return 'Login';
    
    switch (loginMode) {
      case 'checking':
        return 'Checking connection...';
      case 'online':
        return 'Logging in online...';
      case 'offline':
        return 'Logging in offline...';
      default:
        return 'Logging in...';
    }
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Login</Text>
      </View>
      
      <View style={styles.bodyContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Email"
          style={styles.textInputField}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!isLoading}
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Password"
          style={styles.textInputField}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />
        
        {errorView && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        
        
        <TouchableOpacity
          style={[
            styles.loginButton,
            isLoading && styles.loginButtonDisabled
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {getLoginButtonText()}
          </Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          This app works offline! Your account will be saved locally for offline access.
        </Text>
      </View>
    </SafeAreaProvider>
  );
};

export default UserLogin;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 24,
  },
  bodyContainer: {
    paddingBottom: 40,
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  textInputField: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#759226',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    backgroundColor: '#a5b366',
  },
  loginButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modeText: {
    color: '#759226',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#666',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});