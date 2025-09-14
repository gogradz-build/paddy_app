import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestore } from '../../firebase/firebaseConfig';

const userLogin = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorView, setErrorView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    
    setError('');
    setErrorView(false);

    
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
      console.log('Starting user login...');
      
      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      console.log('User signed in successfully:', firebaseUser.uid);

      
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('User data not found. Please contact support.');
        setErrorView(true);
        return;
      }

      const userData = userDoc.data();
      console.log('User data retrieved:', userData);

      
      const userDataToStore = {
        uid: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
        district: userData.district,
        city: userData.city,
        userType: userData.userType,
        isActive: userData.isActive,
        profileComplete: userData.profileComplete,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };

      await AsyncStorage.setItem('userData', JSON.stringify(userDataToStore));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userType', userData.userType);

      console.log('User data saved to AsyncStorage');

      
      setEmail('');
      setPassword('');
      Keyboard.dismiss();

      
      const userType = userData.userType;
      
      Alert.alert(
        'Success!', 
        'Login successful!',
        [
          {
            text: 'OK',
            onPress: () => {
              switch (userType) {
                case 'farmer':
                  router.replace('/(farmer)/dashboard' as any);
                  break;
                case 'buyer':
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

    } catch (error: any) {
      console.error('Login error:', error);
      
      
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please check your email or register.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message || 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
      setErrorView(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleBack()}>
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
            {isLoading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
};

export default userLogin;

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
});