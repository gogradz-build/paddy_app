import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestore } from '../../firebase/firebaseConfig';

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
  // const userRef = firebase.firestore().collection('users')

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState(districts[0]);
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,setError] = useState('');
  const [errorView,setErrorView] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation function
  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleRegister = async () => {
    // Reset previous errors
    setError('');
    setErrorView(false);

    // Validation
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
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      console.log('User created in Firebase Auth:', firebaseUser.uid);

      
      await updateProfile(firebaseUser, {
        displayName: name.trim(),
      });

      
      const userData = {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        district: district,
        city: city.trim(),
        userType: user || 'farmer', 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        emailVerified: firebaseUser.emailVerified,
        profileComplete: true,
       
      };

      
      await setDoc(doc(firestore, 'users', firebaseUser.uid), userData);

      console.log('User data saved to Firestore successfully');

      
      setName('');
      setEmail('');
      setCity('');
      setPassword('');
      setConfirmPassword('');
      Keyboard.dismiss();
      setIsLoading(false)
      Alert.alert(
        'Success!', 
        'Account created successfully!',
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
          errorMessage = error.message || 'Registration failed. Please try again.';
      }
      
      setError(errorMessage);
      setErrorView(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = ()=>{
    router.back();
  }
  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleBack()}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Register</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.bodyContainer}
        keyboardShouldPersistTaps="handled"
      >
         <Text style={styles.label}>Name</Text>
         <TextInput
          placeholder="Name"
          style={styles.textInputField}
          value={name}
          onChangeText={setName}
          editable={!isLoading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Email"
          style={styles.textInputField}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!isLoading}
        />

        <Text style={styles.label}>District</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={district}
            onValueChange={(value: any) => setDistrict(value)}
            style={styles.picker}
            
          >
            {districts.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>City</Text>
        <TextInput
          placeholder="City"
          style={styles.textInputField}
          value={city}
          onChangeText={setCity}
          editable={!isLoading}
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

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          placeholder="Confirm Password"
          style={styles.textInputField}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!isLoading}
        />
        
        {errorView && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading===true &&(
            <Text style={styles.registerButtonText}>Registering</Text>
          )}
          {isLoading===false &&(
            <Text style={styles.registerButtonText}>Register</Text>
          )}
          
        </TouchableOpacity>
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
  registerButtonText: {
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


