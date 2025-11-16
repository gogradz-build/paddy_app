import DownloadReportButton from '@/components/DownloadReportButton';
import { AntDesign, EvilIcons, Feather, FontAwesome5, Foundation, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, getDocs, getFirestore, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserData = {
  uid: string;
  name: string;
  email: string;
  district: string;
  city: string;
  userType: string;
  isActive: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

type Transaction = {
  id: string;
  farmerUid: string;
  vendorUid: string;
  paddyId: string;
  paddyName: string;
  measuredQty: number;
  price: number;
  createdAt?: any;
  status?: string;
};

type FarmerPaddy = {
  id: string;
  qty: number;
  price: number;
  [key: string]: any;
};

type BagSale = {
  id: string;
  qtySold: number;
  salePrice?: number;
  [key: string]: any;
};

const dashboard = () => {
  const test = require("../../assets/images/sampleUser.png");
  const cloude = require("../../assets/images/cloude.png");
  const [userName, setUserName] = useState('Guest');
  const [city, setCity] = useState('Unknown');
  const paddy = require('../../assets/images/paddy.png');

  const [regUsers, setRegUsers] = useState<number>(0);
  const [paddycount, setPaddyCount] = useState<number>(0);
  const [totalHarvest, setTotalHarvest] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [locationCount, setLocationCount] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const db = getFirestore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Safe navigation wrapper
  const safeNavigate = (path: string) => {
    try {
      router.push(path as any);
    } catch (error) {
      console.error(`Navigation error to ${path}:`, error);
      Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
    }
  };

  const getUserCount = async () => {
    try {
      const coll = collection(db, "users");
      const snapshot = await getCountFromServer(coll);
      const count = snapshot.data().count || 0;
      console.log("Total registered users:", count);
      setRegUsers(count);
      return count;
    } catch (error) {
      console.error("Error getting user count:", error);
      setRegUsers(0);
      return 0;
    }
  };

  const getpaddyCount = async () => {
    try {
      const coll = collection(db, "paddy");
      const snapshot = await getCountFromServer(coll);
      const count = snapshot.data().count || 0;
      console.log("Total paddy Count is:", count);
      setPaddyCount(count);
      return count;
    } catch (error) {
      console.error("Error getting paddy count:", error);
      setPaddyCount(0);
      return 0;
    }
  };

  const getLocationCount = async () => {
    try {
      const farmerLocationsColl = collection(db, "farmer_location");
      const snapshot = await getCountFromServer(farmerLocationsColl);
      const count = snapshot.data().count || 0;
      console.log("Total GPS locations:", count);
      setLocationCount(count);
      return count;
    } catch (error) {
      console.error("Error getting location count:", error);
      setLocationCount(0);
      return 0;
    }
  };

  const calculateTotalHarvestAndRevenue = async () => {
    try {
      setIsLoadingStats(true);

      // Fetch all farmer_paddy data
      const farmerPaddySnapshot = await getDocs(collection(db, 'farmer_paddy'));
      const farmerPaddyData: FarmerPaddy[] = [];
      
      farmerPaddySnapshot.forEach((doc) => {
        farmerPaddyData.push({
          id: doc.id,
          ...doc.data()
        } as FarmerPaddy);
      });

      // Calculate total harvest (sum of all quantities)
      const harvest = farmerPaddyData.reduce((sum, item) => {
        return sum + (Number(item.qty) || 0);
      }, 0);

      // Fetch all bag_sales data
      const bagSalesSnapshot = await getDocs(collection(db, 'bag_sales'));
      const bagSalesData: BagSale[] = [];
      
      bagSalesSnapshot.forEach((doc) => {
        bagSalesData.push({
          id: doc.id,
          ...doc.data()
        } as BagSale);
      });

      // Calculate total revenue from bag sales
      let revenue = 0;
      
      // Method 1: If bag_sales has salePrice field
      revenue = bagSalesData.reduce((sum, sale) => {
        return sum + (Number(sale.salePrice) || 0);
      }, 0);

      // Method 2: If we need to calculate from qtySold and paddy prices
      if (revenue === 0) {
        // Create a map of paddy prices
        const paddyPriceMap = farmerPaddyData.reduce((map, paddy) => {
          map[paddy.id] = Number(paddy.price) || 0;
          return map;
        }, {} as Record<string, number>);

        // Calculate revenue from qtySold * price
        revenue = bagSalesData.reduce((sum, sale) => {
          const qtySold = Number(sale.qtySold) || 0;
          const price = paddyPriceMap[sale.farmerPaddyUID || ''] || 0;
          return sum + (qtySold * price);
        }, 0);
      }

      console.log('Total Harvest:', harvest, 'kg');
      console.log('Total Revenue:', revenue, 'LKR');

      setTotalHarvest(harvest);
      setTotalRevenue(revenue);

    } catch (error) {
      console.error('Error calculating harvest and revenue:', error);
      setTotalHarvest(0);
      setTotalRevenue(0);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        if (isMounted) {
          await loadUserName();
          await Promise.all([
            getUserCount(),
            getpaddyCount(),
            getLocationCount(),
            calculateTotalHarvestAndRevenue()
          ]);
          unsubscribe = fetchAdminTransactions();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert('Error', 'Failed to load dashboard data. Please restart the app.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing:", error);
        }
      }
    };
  }, []);

  const loadUserName = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      
      if (!userDataString) {
        console.warn("No user data found in storage");
        setUserName('Guest');
        setCity('Unknown');
        return;
      }

      const userData: UserData = JSON.parse(userDataString);
      
      if (!userData || typeof userData !== 'object') {
        throw new Error("Invalid user data format");
      }

      setUserName(userData.name || 'Guest');
      setCity(userData.city || 'Unknown');
    } catch (error) {
      console.error("Error loading username:", error);
      setUserName('Guest');
      setCity('Unknown');
      
      if (error instanceof SyntaxError) {
        try {
          await AsyncStorage.removeItem("userData");
        } catch (clearError) {
          console.error("Error clearing corrupted data:", clearError);
        }
      }
    }
  };

  const fetchAdminTransactions = () => {
    try {
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          try {
            const items: Transaction[] = querySnapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                farmerUid: data.farmerUid || '',
                vendorUid: data.vendorUid || '',
                paddyId: data.paddyId || '',
                paddyName: data.paddyName || 'Unknown',
                measuredQty: Number(data.measuredQty) || 0,
                price: Number(data.price) || 0,
                createdAt: data.createdAt,
                status: data.status || 'pending'
              } as Transaction;
            });
            setTransactions(items);
          } catch (error) {
            console.error('Error processing transactions:', error);
            setTransactions([]);
          }
        },
        (error) => {
          console.error('Error fetching admin transactions:', error);
          setTransactions([]);
          Alert.alert('Error', 'Failed to load transactions. Please check your connection.');
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up transaction listener:', error);
      return undefined;
    }
  };

  const setLogout = async () => {
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
                setCity("Unknown");
                safeNavigate("/");
              } catch (error) {
                console.error("Error during logout:", error);
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error showing logout alert:", error);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={test} style={styles.coverImg} />
          <View style={styles.headerContainer}>
            <Text style={styles.hederTitle}>Welcome, {userName}!</Text>
            <Text style={styles.hederText}>
              Here's your paddy farm status at a glance
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.imgcontainer}>
            <View style={styles.imgRow}>
              <Image source={cloude} />
              <Text style={{ color: "white" }}>28°C</Text>
            </View>
            <View style={styles.imgRow}>
              <Ionicons name={"location"} size={24} color={"#759226"} />
              <Text style={styles.cityText}>{city}, Sri Lanka</Text>
            </View>
          </View>

          <View style={styles.rightRow}>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <Ionicons name={"leaf-sharp"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Harvest</Text>
              </View>
              {isLoadingStats ? (
                <ActivityIndicator color="#759226" size="small" />
              ) : (
                <Text style={styles.bodyLargeTitle}>{formatNumber(totalHarvest)} kg</Text>
              )}
            </View>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <FontAwesome5 name={"coins"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Revenue</Text>
              </View>
              {isLoadingStats ? (
                <ActivityIndicator color="#759226" size="small" />
              ) : (
                <Text style={styles.bodyLargeTitle}>LKR {formatNumber(totalRevenue)}</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.bodyTitle}>Dashboard</Text>
        <View style={styles.maincard}>
          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <Feather name="user" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Total Users</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{regUsers}</Text>
            </View>
          </View>

          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <MaterialIcons name="currency-exchange" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Active Transactions</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{transactions.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.maincard}>
          <View style={styles.secondCard}>
            <View style={{display:'flex', flexDirection:'column',alignItems:'center',width:'50%',height:'100%',justifyContent:'center',gap:8}}>
              <EvilIcons name="location" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>GPS location</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{locationCount}</Text>
            </View>
          </View>

          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <FontAwesome5 name="seedling" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Total Variants</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{paddycount}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.bodyTitle}>Quick Access Menu</Text>
        <View style={styles.quckAccess}>
          <View style={styles.smallcard}>
            <Feather name='users' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={() => safeNavigate('/ui/Users')}>
              <Text style={styles.bttntext}>User</Text>
            </TouchableOpacity>
          </View>
        
          <View style={styles.smallcard}>
            <Ionicons name='pricetags-outline' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={() => safeNavigate('/(admin)/price')}>
              <Text style={styles.bttntext}>Price Control</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smallcard}>
            <Foundation name='clipboard-notes' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={() => safeNavigate('/(admin)/history')}>
              <Text style={styles.bttntext}>Transactions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smallcard}>
            <FontAwesome5 name="seedling" color={"#000"} size={32} />
            <TouchableOpacity style={styles.bttn} onPress={() => safeNavigate('/(admin)/store')}>
              <Text style={styles.bttntext}>Paddy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smallcard}>
            <AntDesign name='control' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={() => safeNavigate('/(admin)/profile')}>
              <Text style={styles.bttntext}>Settings</Text>
            </TouchableOpacity>
          </View>

          <DownloadReportButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 24,
    display: "flex",
    flexDirection: "row",
    paddingBottom: 16,
    gap: 8,
  },
  coverImg: {
    width: 72,
    height: 72,
    borderRadius: 26,
    objectFit: "cover",
  },
  hederTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 24,
  },
  hederText: {
    fontFamily: "Inter-Regular",
    fontSize: 12,
  },
  headerContainer: {
    display: "flex",
    flexDirection: "column",
  },
  body: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    marginBottom: 16,
  },
  bodyLargeTitle: {
    color: "#759226",
    fontFamily: "Inter-Regular",
    textAlign: "right",
    fontSize: 18,
  },
  bodySubtitle: {
    fontSize: 16,
    color: "#E8F5E8",
    marginTop: 5,
    fontFamily: "Inter-Regular",
  },
  imgcontainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    justifyContent: "space-between",
  },
  imgRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  cityText: {
    color: "#ADADAD",
    fontSize: 12,
  },
  rightRow: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  smallTitle: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 14,
  },
  maincard: {
    display: "flex",
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
    paddingLeft: 1,
    paddingRight: 2,
    justifyContent: "space-between",
    marginBottom:16,
  },
  secondCard: {
    flex:1,
    height: 104,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: "space-between",
    paddingLeft:4
  },
  bodyTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 18,
  },
  bodysecondTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    paddingLeft: 2,
    textAlign:'center'
  },
  leftCard: {
    flex: 1,                        
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qtycard: {
    width: 73,
    height: 61,
    justifyContent: "center",
    alignSelf: "flex-end",
    backgroundColor: "#E2E2E2",
    borderTopLeftRadius: 24.5,
    alignItems: "center",
    borderBottomRightRadius: 12,
  },
  quckAccess:{
    marginTop:16,
    display:'flex',
    flexDirection:'row',
    gap:24,
    flexWrap:'wrap',
    paddingLeft:8,
    justifyContent:'space-between'
  },
  smallcard:{
    width:104,
    alignItems:'center',
    gap:8
  },
  bttn:{
    width:100,
    height:32,
    borderRadius:26,
    backgroundColor:'#000',
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center'
  },
  bttntext:{
    color:'#fff',
    fontSize:12,
    fontFamily:'Inter-Regular'
  }
});