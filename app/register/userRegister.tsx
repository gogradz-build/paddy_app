import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import NetInfo from '@react-native-community/netinfo';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestore } from '../../firebase/firebaseConfig';

import { useUser } from '@/contexts/UserContext';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const districts = [
  "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota",
  "Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara",
  "Moneragala","Mullaitivu","Nuwara Eliya","Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya"
];

const UserRegister = () => {
  const { user } = useLocalSearchParams();
  const router = useRouter();
  
  const { saveUserToDB } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState(districts[0]);
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorView, setErrorView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  
  // Handle userType correctly
  const userType = Array.isArray(user) ? user[0] : user || 'farmer';
  const isBuyer = userType === 'buyer';
  const isFarmer = userType === 'farmer';

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      
      if (!state.isConnected) {
        setError('Internet connection required to create an account');
        setErrorView(true);
      } else if (state.isConnected && errorView && error.includes('Internet connection')) {
        setError('');
        setErrorView(false);
      }
    });

    return () => unsubscribe();
  }, [errorView, error]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const checkInternetConnection = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  };

  const handleRegister = async () => {
    setError('');
    setErrorView(false);

    const hasConnection = await checkInternetConnection();
    if (!hasConnection) {
      setError('Internet connection is required to create an account. Please check your connection and try again.');
      setErrorView(true);
      return;
    }

    if (!name.trim() || !email.trim() || !district || !city.trim() || !password || !confirmPassword) {
      setError('Please fill all fields');
      setErrorView(true);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setErrorView(true);
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      setErrorView(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setErrorView(true);
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting user registration...');
      console.log('User type:', userType);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      console.log('User created in Firebase Auth:', firebaseUser.uid);

      // Update profile with display name
      await updateProfile(firebaseUser, {
        displayName: name.trim(),
      });

      // Prepare Firestore user data
      const firestoreUserData = {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        district: district,
        city: city.trim(),
        userType: userType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        profileComplete: true,
        emailVerified: firebaseUser.emailVerified,
      };

      // Save to Firestore
      await setDoc(doc(firestore, 'users', firebaseUser.uid), firestoreUserData);
      console.log('User data saved to Firestore successfully');

      // Prepare local SQLite user data
      const localUserData = {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        district: district,
        city: city.trim(),
        userType: userType,
        password: password, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        isActive: true,
        profileComplete: true,
      };
      
      // Save to SQLite for offline access
      try {
        await saveUserToDB(localUserData);
        console.log('User data saved to SQLite successfully for offline access');
      } catch (sqliteError) {
        console.error('SQLite save error:', sqliteError);
      }

      // Clear form
      setName('');
      setEmail('');
      setCity('');
      setPassword('');
      setConfirmPassword('');
      Keyboard.dismiss();
      setIsLoading(false);
      
      // Success message based on user type
      let successMessage = 'Account created successfully!';
      if (isBuyer) {
        successMessage = 'Buyer account created successfully! You can now browse and purchase products from farmers.';
      } else if (isFarmer) {
        successMessage = 'Farmer account created successfully! You can now list your products and connect with buyers.';
      }
      
      Alert.alert(
        'Success!', 
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/login' as any);
            },
          },
        ]
      );

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message || 'Registration failed. Please check your internet connection and try again.';
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
        <Text style={styles.headerText}>
          Register {isFarmer ? '(Farmer)' : isBuyer ? '(Buyer)' : ''}
        </Text>
      </View>

      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Text style={styles.connectionWarningText}>
            No internet connection. Registration requires an active internet connection.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.bodyContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Name"
          style={[styles.textInputField, !isConnected && styles.disabledInput]}
          value={name}
          onChangeText={setName}
          editable={!isLoading && isConnected}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Email"
          style={[styles.textInputField, !isConnected && styles.disabledInput]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading && isConnected}
        />

        <Text style={styles.label}>District</Text>
        <View style={[styles.pickerContainer, !isConnected && styles.disabledInput]}>
          <Picker
            selectedValue={district}
            onValueChange={(value: any) => setDistrict(value)}
            style={styles.picker}
            enabled={!isLoading && isConnected}
          >
            {districts.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>City</Text>
        <TextInput
          placeholder="City"
          style={[styles.textInputField, !isConnected && styles.disabledInput]}
          value={city}
          onChangeText={setCity}
          editable={!isLoading && isConnected}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Password"
          style={[styles.textInputField, !isConnected && styles.disabledInput]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading && isConnected}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          placeholder="Confirm Password"
          style={[styles.textInputField, !isConnected && styles.disabledInput]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!isLoading && isConnected}
        />
        
        {errorView && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.registerButton, 
            (isLoading || !isConnected) && styles.registerButtonDisabled
          ]}
          onPress={handleRegister}
          disabled={isLoading || !isConnected}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" style={styles.loader} />
              <Text style={styles.registerButtonText}>Registering...</Text>
            </View>
          ) : (
            <Text style={styles.registerButtonText}>
              {!isConnected ? 'No Internet Connection' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        {isFarmer && (
          <Text style={styles.helpText}>
            🌾 As a farmer, you'll be able to list your products and connect with buyers in your area.
          </Text>
        )}

        {isBuyer && (
          <Text style={styles.helpText}>
            🛒 As a buyer, you'll be able to browse and purchase fresh products directly from local farmers.
          </Text>
        )}

        {!isConnected && (
          <Text style={styles.helpText}>
            Registration requires an internet connection to create your account securely. 
            Once registered, you'll be able to login offline.
          </Text>
        )}
      </ScrollView>
    </SafeAreaProvider>
  );
};

export default UserRegister;

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
  connectionWarning: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  connectionWarningText: {
    color: '#856404',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
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
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
    opacity: 0.6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  registerButton: {
    backgroundColor: '#759226',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  registerButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 8,
  },
  errorText: {
    color: 'red',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  helpText: {
    color: '#666',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});