import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { AntDesign, Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { firestore } from '../../firebase/firebaseConfig';
import ChnagePassword from '../ui/ChnagePassword';

import ManageLocations from '@/components/ManageLocations';
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
  uid?: string;
  userType?: string;
};

type Location = {
  id: string;
  userId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    street: string;
    city: string;
    district: string;
    formattedAddress: string;
  };
  locationType: string;
  isPrimary: boolean;
  isActive: boolean;
  locationStatus: string;
  notes: string;
  deliveryInstructions: string;
  createdAt: any;
  updatedAt: any;
};

const profile = () => {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [settingPopup, setSettingPopup] = useState<boolean>(false);
  const [changePassword, setChangePassword] = useState<boolean>(false);
  const [manageLocationsModal, setManageLocationsModal] = useState<boolean>(false);
  const [userProfileData, setUserProfileData] = useState<UserData | null>(null);
  const [userLocations, setUserLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationCount, setLocationCount] = useState(0);

  const loadUserName = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      
      if (userDataString) {
        const userData: UserData = JSON.parse(userDataString);
        setUserName(userData.name);
        setEmail(userData.email);
        setUserProfileData(userData);
        
        // Load locations if user is a buyer
        if (userData.userType === 'buyer' && userData.uid) {
          loadUserLocations(userData.uid);
        }
      }
    } catch (error) {
      console.error("Error loading username:", error);
      setUserName(''); 
    } 
  };

  const loadUserLocations = async (userId: string) => {
    setLoadingLocations(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      const q = query(
        locationsRef, 
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const locations: Location[] = [];
      
      querySnapshot.forEach((doc) => {
        locations.push({
          id: doc.id,
          ...doc.data()
        } as Location);
      });
      
      // Sort by primary first, then by creation date
      locations.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });
      
      setUserLocations(locations);
      setLocationCount(locations.length);
    } catch (error) {
      console.error("Error loading locations:", error);
      Alert.alert('Error', 'Failed to load your locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    loadUserName();
  }, []);

  // Reload locations when modal closes
  useEffect(() => {
    if (!manageLocationsModal && userProfileData?.uid && userProfileData?.userType === 'buyer') {
      loadUserLocations(userProfileData.uid);
    }
  }, [manageLocationsModal]);

  const initial = userName?.trim().charAt(0).toUpperCase() || "?";
  const backgroundColor = colors[Math.floor(Math.random() * colors.length)];

  const handleBack = (): void => {
    router.back();
  };

  const setLogout = async () => {
    try {
      await AsyncStorage.removeItem("userData");
      setUserName("");
      setEmail("");
      router.push("/");
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  const haddleSetting = () => {
    setSettingPopup(true);
  };

  const handleChangePW = () => {
    setChangePassword(true);
  };

  const handleTransaction = () => {
    router.push('/(vendor)/history');
  };

  const handleManageLocations = () => {
    setManageLocationsModal(true);
  };

  const isBuyer = userProfileData?.userType === 'buyer';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>User Profile</Text>
      </View>

      <View style={styles.profileContainer}>
        <View style={[styles.userNameRound, { backgroundColor }]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
        <Text style={styles.nameText}>{userName}</Text>
        <Text style={styles.emailText}>{email}</Text>
        {isBuyer && (
          <View style={styles.userTypeBadge}>
            <Text style={styles.userTypeBadgeText}>BUYER</Text>
          </View>
        )}
      </View>

      <View style={styles.profileTabContainer}>
        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <Feather name='settings' color={'#000'} size={24}/>
            <Text style={styles.itemText}>Settings</Text>
          </View>
          <TouchableOpacity onPress={haddleSetting}>
            <MaterialIcons name='arrow-forward-ios' color='#000' size={24}/>
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <AntDesign name='lock' color={'#000'} size={24}/>
            <Text style={styles.itemText}>Change Password</Text>
          </View>
          <TouchableOpacity onPress={handleChangePW}>
            <MaterialIcons name='arrow-forward-ios' color='#000' size={24}/>
          </TouchableOpacity>
        </View>

        {isBuyer && (
          <View style={styles.itemRow}>
            <View style={styles.itemFirstSection}>
              <Ionicons name='location' color={'#759226'} size={24}/>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemText}>Manage Locations</Text>
                {loadingLocations ? (
                  <ActivityIndicator size="small" color="#759226" />
                ) : (
                  <Text style={styles.itemSubText}>
                    {locationCount} {locationCount === 1 ? 'location' : 'locations'} saved
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleManageLocations}>
              <MaterialIcons name='arrow-forward-ios' color='#000' size={24}/>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <MaterialIcons name='edit-note' color={'#000'} size={24}/>
            <Text style={styles.itemText}>Transaction</Text>
          </View>
          <TouchableOpacity onPress={handleTransaction}>
            <MaterialIcons name='arrow-forward-ios' color='#000' size={24}/>
          </TouchableOpacity>
        </View>

        <View style={styles.itemRow}>
          <View style={styles.itemFirstSection}>
            <MaterialIcons name='logout' color={'#E62727'} size={24}/>
            <Text style={styles.itemText}>Logout</Text>
          </View>
          <TouchableOpacity onPress={setLogout}>
            <MaterialIcons name='arrow-forward-ios' color='#000' size={24}/>
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
            <View style={styles.modalContent}>
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
            <View style={styles.modalContent}>
              <ChnagePassword setChangePassword={setChangePassword} />
            </View>
          </View>
        </Modal>
      )}

      {manageLocationsModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={manageLocationsModal}
          onRequestClose={() => setManageLocationsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <ManageLocations 
                setManageLocationsModal={setManageLocationsModal}
                userId={userProfileData?.uid || ''}
                userName={userName}
                userEmail={email}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

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
  profileContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  initial: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 32,
    color: '#f4f4f4'
  },
  userNameRound: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4f4f4',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center'
  },
  nameText: {
    color: '#000',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16
  },
  emailText: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 11
  },
  userTypeBadge: {
    backgroundColor: '#759226',
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
    marginTop: 32
  },
  itemRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  itemText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16
  },
  itemSubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    height: 700,
    backgroundColor: "white",
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