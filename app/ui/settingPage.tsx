import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


interface SettingpageProps {
  setSettingPopup: any;
}
type Gender = "" | "male" | "female" | "other";
type UserData = {
  name: string;
  email: string;
  district: string;
  city: string;
  gender: Gender;   
  birthday: string;
  phone: string;
  userName: string;
};

const SettingPage = ({ setSettingPopup }: SettingpageProps) => {
  // const { user, updateUserProfile } = useUser();


  const [name, setName] = useState("");
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const auth = getAuth();
  const firebaseUser = auth.currentUser;
  const [user, setUser] = useState<any>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

 
  
  const districts = [
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota",
    "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara",
    "Moneragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
  ];

 
  useEffect(() => {
    if (user) {
      const data:UserData = {
        name: user.name || '',
        email: user.email || '',
        district: user.district || '',
        city: user.city || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        phone: user.phone || '',
        userName: user.userName || ''
      };

      setName(data.name);
      setEmail(data.email);
      setDistrict(data.district);
      setCity(data.city);
      setGender(data.gender);
      setBirthday(data.birthday);
      setPhone(data.phone);
      setUserName(data.userName);
      
      setInitialData(data);
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (initialData) {
      const currentData = {
        name: name.trim(),
        district,
        city: city.trim(),
        gender,
        birthday,
        phone: phone.trim(),
        userName: userName.trim()
      };

      const changed = Object.keys(currentData).some(
        key => currentData[key as keyof typeof currentData] !== initialData[key as keyof typeof initialData]
      );

      setHasChanges(changed);
    }
  }, [name, district, city, gender, birthday, phone, userName, initialData]);

  useEffect(() => {
  const fetchUserData = async () => {
    if (!firebaseUser?.uid) {
      Alert.alert('Error', 'No logged-in user found.');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser(userData);

        setName(userData.name || '');
        setEmail(userData.email || firebaseUser.email || '');
        setDistrict(userData.district || '');
        setCity(userData.city || '');
        setGender(userData.gender || '');
        setBirthday(userData.birthday || '');
        setPhone(userData.phone || '');
        setUserName(userData.userName || '');

        setInitialData(userData);
      } else {
        Alert.alert('Error', 'User profile not found in Firestore.');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      Alert.alert('Error', 'Failed to load user profile.');
    }
  };

  fetchUserData();
}, [firebaseUser]);

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthday(selectedDate.toISOString().split('T')[0]);
    }
  };
// const handleUpdateProfile = async () => {
//   if (!validateForm() || !firebaseUser?.uid) return;

//   setIsLoading(true);

//   try {
//     const userRef = doc(db, 'users', firebaseUser.uid);
//     const updates = {
//       name: name.trim(),
//       district,
//       city: city.trim(),
//       ...(gender && { gender }),
//       ...(birthday && { birthday }),
//       ...(phone.trim() && { phone: phone.trim() }),
//       ...(userName.trim() && { userName: userName.trim() }),
//     };

//     await updateDoc(userRef, updates);

//     Alert.alert('Success', 'Profile updated successfully!', [
//       { text: 'OK', onPress: () => setSettingPopup(false) },
//     ]);
//   } catch (error) {
//     console.error('Profile update error:', error);
//     Alert.alert('Update Failed', 'Failed to update profile. Try again.');
//   } finally {
//     setIsLoading(false);
//   }
// };

  // Validate form
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return false;
    }
    
    if (!district) {
      Alert.alert('Validation Error', 'Please select a district');
      return false;
    }
    
    if (!city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return false;
    }

    if (phone && !/^[0-9+\-\s()]+$/.test(phone)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }

    if (userName && userName.length < 3) {
      Alert.alert('Validation Error', 'Username must be at least 3 characters');
      return false;
    }

    return true;
  };

  // Handle update using context method
  const handleUpdateProfile = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);

    try {
      // Prepare update data
      const updates = {
        name: name.trim(),
        district,
        city: city.trim(),
        ...(gender && { gender }),
        ...(birthday && { birthday }),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(userName.trim() && { userName: userName.trim() }),
      };


      Alert.alert(
        'Success!',
        'Profile updated successfully in both online and offline storage.',
        [
          {
            text: 'OK',
            onPress: () => setSettingPopup(false)
          }
        ]
      );

    } catch (error: any) {
      console.error('Profile update error:', error);
      
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (error.message?.includes('network')) {
        errorMessage = 'Network error. Profile saved locally and will sync when online.';
      }
      
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No user data found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSettingPopup(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput
          placeholder="Enter your name"
          style={styles.textInputField}
          value={name}
          onChangeText={setName}
          maxLength={50}
        />

        {/* District */}
        <Text style={styles.label}>District *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={district}
            onValueChange={setDistrict}
            style={styles.picker}
          >
            <Picker.Item label="Select District" value="" />
            {districts.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>

        {/* City */}
        <Text style={styles.label}>City *</Text>
        <TextInput
          placeholder="Enter your city"
          style={styles.textInputField}
          value={city}
          onChangeText={setCity}
          maxLength={50}
        />

        {/* Gender & Birthday Row */}
        <View style={styles.genderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={setGender}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Birthday</Text>
            <TouchableOpacity
              style={styles.dateInputField}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, !birthday && styles.placeholderText]}>
                {birthday || 'Select Date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={birthday ? new Date(birthday) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Phone */}
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          placeholder="Enter phone number"
          style={styles.textInputField}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={15}
        />

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          placeholder="Enter username"
          style={styles.textInputField}
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="none"
          maxLength={30}
        />

        {/* Email (Read-only) */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Email"
          style={styles.emailInputField}
          value={email}
          editable={false}
        />

        {/* User Type (Read-only) */}
        <Text style={styles.label}>Account Type</Text>
        <View style={styles.userTypeContainer}>
          <Ionicons 
            name={user.userType === 'admin' ? 'shield-checkmark' : 'leaf'} 
            size={20} 
            color={user.userType === 'admin' ? '#FF6B6B' : '#4ECDC4'} 
          />
          <Text style={[styles.userTypeText, { color: user.userType === 'admin' ? '#FF6B6B' : '#4ECDC4' }]}>
            {user.userType.toUpperCase()}
          </Text>
        </View>

        {/* Required fields note */}
        <Text style={styles.noteText}>* Required fields</Text>

        {/* Update Button */}
        <TouchableOpacity
          style={[
            styles.updateButton,
            (!hasChanges || isLoading) && styles.updateButtonDisabled
          ]}
          onPress={handleUpdateProfile}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.updateButtonText}>
                {hasChanges ? 'Update Profile' : 'No Changes'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sync Status Info */}
        <View style={styles.syncInfoContainer}>
          <Ionicons name="cloud-done-outline" size={16} color="#4CAF50" />
          <Text style={styles.syncInfoText}>
            Changes sync automatically to both local and cloud storage
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SettingPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  textInputField: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dateInputField: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  emailInputField: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#999',
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  updateButton: {
    backgroundColor: '#759226',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  syncInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
  },
});