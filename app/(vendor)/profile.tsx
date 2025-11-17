//vendor/buyer
import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import ViewAllLocations from '@/components/ManageLocations';
import ViewFarmerLocations from '@/components/ViewFarmerLocations';
import { AntDesign, Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { firestore } from '../../firebase/firebaseConfig';
import ChnagePassword from '../ui/ChnagePassword';
import SettingPage from '../ui/settingPage';

const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#A66DD4", "#00B8A9"];

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
  userType?: string;
  uid?: string;
};

const profile = () => {
  const router = useRouter();
  const [userName, setUserName] = useState('Guest');
  const [email, setEmail] = useState('');
  const [settingPopup, setSettingPopup] = useState<boolean>(false);
  const [changePassword, setChangePassword] = useState<boolean>(false);
  const [userProfileData, setUserProfileData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationCount, setLocationCount] = useState(0);
  const [farmerLocationCount, setFarmerLocationCount] = useState(0);
  const [viewLocationsModal, setViewLocationsModal] = useState<boolean>(false);
  const [viewFarmerLocationsModal, setViewFarmerLocationsModal] = useState<boolean>(false);

  // Safe navigation
  const handleBack = useCallback((): void => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate back');
    }
  }, [router]);

  // Safe navigation to routes
  const safeNavigate = useCallback((path: string) => {
    try {
      router.push(path as any);
    } catch (error) {
      console.error(`Navigation error to ${path}:`, error);
      Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
    }
  }, [router]);

  // Load buyer/vendor location count
  const loadLocationCount = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      const q = query(
        locationsRef, 
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      setLocationCount(querySnapshot.size);
      console.log('Buyer/Vendor location count:', querySnapshot.size);
    } catch (error) {
      console.error("Error loading location count:", error);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // Load farmer location count
  const loadFarmerLocationCount = useCallback(async () => {
    try {
      const farmerLocationsRef = collection(firestore, 'farmer_location');
      const q = query(
        farmerLocationsRef, 
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      setFarmerLocationCount(querySnapshot.size);
      console.log('Farmer location count:', querySnapshot.size);
    } catch (error) {
      console.error("Error loading farmer location count:", error);
    }
  }, []);

  // Load user data with comprehensive error handling
  const loadUserName = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userDataString = await AsyncStorage.getItem("userData");
      
      if (!userDataString) {
        console.warn("No user data found in storage");
        setUserName('Guest');
        setEmail('');
        setUserProfileData(null);
        setLoading(false);
        return;
      }

      // Validate JSON before parsing
      let userData: UserData;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        // Clear corrupted data
        await AsyncStorage.removeItem("userData");
        throw new Error("Corrupted user data. Please log in again.");
      }

      // Validate userData structure
      if (!userData || typeof userData !== 'object') {
        throw new Error("Invalid user data format");
      }

      // Set data with fallbacks
      setUserName(userData.name || 'Guest');
      setEmail(userData.email || '');
      setUserProfileData(userData);
      
      console.log('User type:', userData.userType);
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading user data:", error);
      setError(error instanceof Error ? error.message : 'Failed to load user data');
      setUserName('Guest');
      setEmail('');
      setUserProfileData(null);
      setLoading(false);

      // Show error alert
      Alert.alert(
        'Error Loading Profile',
        error instanceof Error ? error.message : 'Please try logging in again.',
        [
          {
            text: 'Retry',
            onPress: () => loadUserName()
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => setLogout()
          }
        ]
      );
    }
  }, []);

  // Load location counts after user data is loaded
  useEffect(() => {
    if (userProfileData) {
      console.log('Loading location counts for user type:', userProfileData.userType);
      loadLocationCount();
      loadFarmerLocationCount();
    }
  }, [userProfileData, loadLocationCount, loadFarmerLocationCount]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isMounted) {
        await loadUserName();
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadUserName]);

  // Reload location counts when modals close
  useEffect(() => {
    if (!viewLocationsModal && userProfileData) {
      loadLocationCount();
    }
  }, [viewLocationsModal, loadLocationCount, userProfileData]);

  useEffect(() => {
    if (!viewFarmerLocationsModal && userProfileData) {
      loadFarmerLocationCount();
    }
  }, [viewFarmerLocationsModal, loadFarmerLocationCount, userProfileData]);

  // Safe logout with confirmation
  const setLogout = useCallback(async () => {
    try {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem("userData");
                setUserName("Guest");
                setEmail("");
                setUserProfileData(null);
                safeNavigate("/");
              } catch (error) {
                console.error("Error during logout:", error);
                Alert.alert('Error', 'Failed to logout completely. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error showing logout alert:", error);
      // Fallback: try to logout anyway
      try {
        await AsyncStorage.removeItem("userData");
        safeNavigate("/");
      } catch (logoutError) {
        console.error("Critical logout error:", logoutError);
      }
    }
  }, [safeNavigate]);

  // Safe modal handlers
  const handleSetting = useCallback(() => {
    try {
      setSettingPopup(true);
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Unable to open settings');
    }
  }, []);

  const handleChangePW = useCallback(() => {
    try {
      setChangePassword(true);
    } catch (error) {
      console.error('Error opening change password:', error);
      Alert.alert('Error', 'Unable to open change password');
    }
  }, []);

  const handleTransaction = useCallback(() => {
    safeNavigate('/(vendor)/history');
  }, [safeNavigate]);

  const handleViewLocations = useCallback(() => {
    setViewLocationsModal(true);
  }, []);

  const handleViewFarmerLocations = useCallback(() => {
    setViewFarmerLocationsModal(true);
  }, []);

  // Safe initial generation
  const getInitial = useCallback(() => {
    try {
      return userName?.trim().charAt(0).toUpperCase() || "?";
    } catch (error) {
      console.error('Error getting initial:', error);
      return "?";
    }
  }, [userName]);

  const getBackgroundColor = useCallback(() => {
    try {
      return colors[Math.floor(Math.random() * colors.length)];
    } catch (error) {
      console.error('Error getting background color:', error);
      return colors[0];
    }
  }, []);

  const initial = getInitial();
  const backgroundColor = getBackgroundColor();

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Vendor Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4D96FF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Vendor Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserName}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={setLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Vendor Profile</Text>
      </View>

      <View style={styles.profileContainer}>
        <View style={[styles.userNameRound, { backgroundColor }]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
        <Text style={styles.nameText}>{userName}</Text>
        <Text style={styles.emailText}>{email || "No email"}</Text>
        <View style={styles.userTypeBadge}>
          <Text style={styles.userTypeBadgeText}>VENDOR</Text>
        </View>
      </View>

      <View style={styles.profileTabContainer}>
        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <Feather name="settings" color={"#000"} size={24} />
            <Text style={styles.itemText}>Settings</Text>
          </View>
          <TouchableOpacity onPress={handleSetting}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <AntDesign name="lock" color={"#000"} size={24} />
            <Text style={styles.itemText}>Change Password</Text>
          </View>
          <TouchableOpacity onPress={handleChangePW}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <Ionicons name="location" color={"#4D96FF"} size={24} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemText}>Buyer Locations</Text>
              {/* {loadingLocations ? (
                <ActivityIndicator size="small" color="#4D96FF" />
              ) : (
                <Text style={styles.itemSubText}>
                  {locationCount} total {locationCount === 1 ? "location" : "locations"}
                </Text>
              )} */}
            </View>
          </View>
          <TouchableOpacity onPress={handleViewLocations}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <MaterialIcons name="agriculture" color={"#759226"} size={24} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemText}>Farmer Locations</Text>
              {/* {loadingLocations ? (
                <ActivityIndicator size="small" color="#759226" />
              ) : (
                <Text style={styles.itemSubText}>
                  {farmerLocationCount} total {farmerLocationCount === 1 ? "farmer" : "farmers"}
                </Text>
              )} */}
            </View>
          </View>
          <TouchableOpacity onPress={handleViewFarmerLocations}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <MaterialIcons name="history" color={"#000"} size={24} />
            <Text style={styles.itemText}>Transaction History</Text>
          </View>
          <TouchableOpacity onPress={handleTransaction}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <MaterialIcons name="logout" color={"#E62727"} size={24} />
            <Text style={styles.itemText}>Logout</Text>
          </View>
          <TouchableOpacity onPress={setLogout}>
            <MaterialIcons name="arrow-forward-ios" color="#000" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {settingPopup && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingPopup}
          onRequestClose={() => setSettingPopup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <SettingPage setSettingPopup={setSettingPopup} />
            </View>
          </View>
        </Modal>
      )}

      {changePassword && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={changePassword}
          onRequestClose={() => setChangePassword(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ChnagePassword setChangePassword={setChangePassword} />
            </View>
          </View>
        </Modal>
      )}

      {viewLocationsModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={viewLocationsModal}
          onRequestClose={() => setViewLocationsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <ViewAllLocations 
                setViewLocationsModal={setViewLocationsModal}
                userType="admin"
              />
            </View>
          </View>
        </Modal>
      )}

      {viewFarmerLocationsModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={viewFarmerLocationsModal}
          onRequestClose={() => setViewFarmerLocationsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <ViewFarmerLocations 
                setViewFarmerLocationsModal={setViewFarmerLocationsModal}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

export default profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4D96FF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 12,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E62727',
  },
  logoutButtonText: {
    color: '#E62727',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  initial: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 32,
    color: '#f4f4f4',
  },
  userNameRound: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4f4f4',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    color: '#000',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  emailText: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 11,
  },
  userTypeBadge: {
    backgroundColor: '#4D96FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  userTypeBadgeText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  profileTabContainer: {
    display: 'flex',
    flexDirection: "column",
    gap: 16,
    marginTop: 32,
  },
  itemRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    shadowColor: "#000",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemFirstSection: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    width: "80%",
    alignItems: 'center',
  },
  itemTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  itemText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  itemSubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    height: 700,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalContentFull: {
    width: "95%",
    height: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
});