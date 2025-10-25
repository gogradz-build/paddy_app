import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import NetInfo from '@react-native-community/netinfo';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestore } from '../../firebase/firebaseConfig';

import { useUser } from '@/contexts/UserContext';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  const userType = Array.isArray(user) ? user[0] : user || 'farmer';
  const isBuyer = userType === 'buyer';

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      
      if (!state.isConnected) {
        setError('Internet connection required to create an account');
        setErrorView(true);
      } else if (!state.isConnected && errorView && error.includes('Internet connection')) {
        setError('');
        setErrorView(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isBuyer) {
      requestLocationPermission();
    }
  }, [isBuyer]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'As a buyer/vendor, we need your location to help farmers find you and deliver products. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      throw new Error('Failed to get current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      const addressResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResults && addressResults.length > 0) {
        const address = addressResults[0];
        return {
          street: address.street || '',
          streetNumber: address.streetNumber || '',
          district: address.district || address.subregion || '',
          city: address.city || address.region || '',
          region: address.region || '',
          postalCode: address.postalCode || '',
          country: address.country || 'Sri Lanka',
          formattedAddress: [
            address.streetNumber,
            address.street,
            address.city,
            address.region,
            address.postalCode,
          ].filter(Boolean).join(', '),
        };
      }
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  };

  const saveLocationToFirestore = async (userId: string, locationData: any) => {
    try {
      const locationDoc = {
        userId: userId,
        userType: userType,
        userName: name.trim(),
        userEmail: email.toLowerCase().trim(),
        
        // GPS Coordinates
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        accuracy: locationData.accuracy,
        altitude: locationData.altitude || null,
        heading: locationData.heading || null,
        speed: locationData.speed || null,
        
        // Address Information
        address: locationData.address || {
          street: '',
          streetNumber: '',
          district: district,
          city: city.trim(),
          region: '',
          postalCode: '',
          country: 'Sri Lanka',
          formattedAddress: `${city.trim()}, ${district}`,
        },
        
        // User-provided location
        userProvidedDistrict: district,
        userProvidedCity: city.trim(),
        
        // Metadata
        isActive: true,
        isPrimary: true,
        locationType: 'business', // business, home, warehouse, etc.
        locationStatus: 'verified',
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastVerifiedAt: serverTimestamp(),
        
        // Additional Info
        notes: '',
        deliveryInstructions: '',
      };

      const locationRef = await addDoc(collection(firestore, 'locations'), locationDoc);
      console.log('Location saved to Firestore with ID:', locationRef.id);
      
      return locationRef.id;
    } catch (error) {
      console.error('Error saving location to Firestore:', error);
      throw error;
    }
  };

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

    // Check location permission for buyers
    if (isBuyer && !locationPermissionGranted) {
      Alert.alert(
        'Location Required',
        'As a buyer/vendor, location access is required to complete registration. This helps farmers find you and deliver products.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Enable Location',
            onPress: () => requestLocationPermission(),
          },
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting user registration...');
      
      // Get location for buyers before creating account
      let locationData = null;
      let addressData = null;
      
      if (isBuyer) {
        try {
          locationData = await getCurrentLocation();
          addressData = await getAddressFromCoordinates(
            locationData.latitude,
            locationData.longitude
          );
          console.log('Location acquired:', locationData);
        } catch (locationError: any) {
          Alert.alert(
            'Location Error',
            'We had trouble getting your location. You can continue registration, but you may need to update your location later in settings.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setIsLoading(false),
              },
              {
                text: 'Continue Anyway',
                onPress: async () => {
                  // Continue without location
                },
              },
            ]
          );
          return;
        }
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      console.log('User created in Firebase Auth:', firebaseUser.uid);

      await updateProfile(firebaseUser, {
        displayName: name.trim(),
      });

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
        hasLocation: isBuyer && locationData !== null,
      };

      await setDoc(doc(firestore, 'users', firebaseUser.uid), firestoreUserData);
      console.log('User data saved to Firestore successfully');

      // Save location for buyers
      if (isBuyer && locationData) {
        try {
          await saveLocationToFirestore(firebaseUser.uid, {
            ...locationData,
            address: addressData,
          });
          console.log('Buyer location saved successfully');
        } catch (locationSaveError) {
          console.error('Failed to save location:', locationSaveError);
          // Don't fail registration if location save fails
        }
      }

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
      
      const successMessage = isBuyer 
        ? 'Account created successfully! Your location has been saved to help farmers deliver products to you.'
        : 'Account created successfully! Your account has been saved both online and locally for offline access.';
      
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
        <Text style={styles.headerText}>Register {isBuyer ? '(Buyer)' : ''}</Text>
      </View>

      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Text style={styles.connectionWarningText}>
            No internet connection. Registration requires an active internet connection.
          </Text>
        </View>
      )}

      {isBuyer && !locationPermissionGranted && (
        <View style={styles.locationWarning}>
          <Text style={styles.locationWarningText}>
             Location access is required for buyer registration to enable product delivery.
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
            (isLoading || !isConnected || isGettingLocation) && styles.registerButtonDisabled
          ]}
          onPress={handleRegister}
          disabled={isLoading || !isConnected || isGettingLocation}
        >
          {isLoading || isGettingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" style={styles.loader} />
              <Text style={styles.registerButtonText}>
                {isGettingLocation ? 'Getting Location...' : 'Registering...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.registerButtonText}>
              {!isConnected ? 'No Internet Connection' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        {isBuyer && (
          <Text style={styles.helpText}>
             Your location will be used to help farmers deliver products to you. 
            Your exact coordinates are kept secure and only approximate location is shared.
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
  locationWarning: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  locationWarningText: {
    color: '#2E7D32',
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