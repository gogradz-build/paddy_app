import { db } from '@/firebase/firebaseConfig';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from 'firebase/auth';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type PaddyItem = {
  id: string;
  name: string;
  paddyCode: string;
  qty: number;
  price: number;
  isSell?: boolean;
  createdAt?: any;
  [key: string]: any;
};

type Paddy = {
  id: string;
  name: string;
  code: string;
};

type Transaction = {
  id: string;
  farmerUid: string;
  vendorUid: string;
  paddyName: string;
  buyNumofBags: number;
  price: number;
  pricePerKg: number;
  createdAt?: any;
  [key: string]: any;
};

type User = {
  id: string;
  name: string;
  [key: string]: any;
};

const dashboard = () => {
  const test = require("../../assets/images/sampleUser.png");
  const cloude = require("../../assets/images/cloude.png");
  const [userName, setUserName] = useState('');
  const [city, setCity] = useState('');
  const paddy = require("../../assets/images/paddy.png");
  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [paddyPriceItems, setPaddyPriceItems] = useState<Paddy[]>([]);
  const [totalHarvest, setTotalHarvest] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [harvestsReady, setHarvestsReady] = useState<number>(0);
  const [latestTransaction, setLatestTransaction] = useState<Transaction | null>(null);
  const [farmerName, setFarmerName] = useState<string>('');
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(true);

  useEffect(() => {
    loadUserName();
    fetchPaddyItems();
    fetchPaddyPriceItems(); 
    fetchHarvestsReady(); 
    fetchLatestTransaction(); 
  }, []);

  useEffect(() => {
    generateDetails();
  }, [paddyItems]);

  const loadUserName = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");

      if (userDataString) {
        const userData: UserData = JSON.parse(userDataString);
        setUserName(userData.name);
        setCity(userData.city);
      }
    } catch (error) {
      console.error("Error loading username:", error);
      setUserName('');
    }
  };

  const fetchPaddyItems = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        return;
      }

      const q = query(collection(db, "farmer_paddy"));

      const querySnapshot = await getDocs(q);
      const items: PaddyItem[] = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as PaddyItem)
      );

      setPaddyItems(items);
      console.log(`Fetched ${items.length} paddy items for this farmer`);
    } catch (error) {
      console.error("Error fetching paddy items:", error);
      Alert.alert("Error", "Failed to load paddy items.");
    }
  };

  const fetchPaddyPriceItems = async () => {
    try {
      const q = query(collection(db, "paddy"));

      const querySnapshot = await getDocs(q);
      const items: Paddy[] = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Paddy)
      );

      setPaddyPriceItems(items);
      console.log(`Fetched ${items.length} Price items`);
    } catch (error) {
      console.error("Error fetching paddy price items:", error);
      Alert.alert("Error", "Failed to load paddy price items.");
    }
  };

  const fetchHarvestsReady = () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        return;
      }

      const q = query(
        collection(db, "farmer_paddy"),
        where("isSell", "==", false)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          setHarvestsReady(querySnapshot.docs.length);
          console.log(`Harvests ready: ${querySnapshot.docs.length}`);
        },
        (error) => {
          console.error("Error fetching harvests ready:", error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up harvests ready listener:", error);
    }
  };

  const fetchLatestTransaction = async () => {
    try {
      setIsLoadingTransaction(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        setIsLoadingTransaction(false);
        return;
      }

      // Query transactions for this vendor, ordered by createdAt descending
      const q = query(
        collection(db, "transactions"),
        where("vendorUid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const transactionData = { id: doc.id, ...doc.data() } as Transaction;
        setLatestTransaction(transactionData);

        // Fetch farmer name using farmerUid
        if (transactionData.farmerUid) {
          const usersSnapshot = await getDocs(
            query(collection(db, "users"), where("uid", "==", transactionData.farmerUid))
          );
          
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data() as User;
            setFarmerName(userData.name || 'Unknown Farmer');
          } else {
            setFarmerName('Unknown Farmer');
          }
        }

        console.log('Latest transaction fetched:', transactionData);
      } else {
        setLatestTransaction(null);
        setFarmerName('');
        console.log('No transactions found for this vendor');
      }
    } catch (error) {
      console.error("Error fetching latest transaction:", error);
      setLatestTransaction(null);
      setFarmerName('');
    } finally {
      setIsLoadingTransaction(false);
    }
  };

  const generateDetails = () => {
    try {
      const tempHarvest = paddyItems.reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      );
      const tempprice = paddyItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      );
      console.log("Total harvest:", tempHarvest);
      setTotalHarvest(tempHarvest);
      setTotalPrice(tempprice);
    } catch (error) {
      console.log("Cannot calculate total harvest", error);
      return 0;
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return new Date().toLocaleDateString();
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return new Date().toLocaleDateString();
    }
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
              <Text style={styles.bodyLargeTitle}>{totalHarvest.toFixed(2)} kg</Text>
            </View>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <FontAwesome5 name={"coins"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Value</Text>
              </View>
              <Text style={styles.bodyLargeTitle}>LKR {totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Latest Transaction Card */}
          {isLoadingTransaction ? (
            <View style={styles.paddycard}>
              <ActivityIndicator size="large" color="#759226" />
            </View>
          ) : latestTransaction ? (
            <View style={styles.paddycard}>
              <View style={styles.leftRow}>
                <Image source={paddy} style={{ width: 163, height: 163 }} />
                <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                  <Text style={styles.statNumber}>
                    {latestTransaction.price.toFixed(0)}
                  </Text>
                  <Text style={styles.lkr}>LKR</Text>
                </View>
                <Text style={styles.cityText}>Transaction Price</Text>
                <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                  <Text style={styles.cardTitle}>Per kg:</Text>
                  <Text style={styles.cardprice}>
                    {latestTransaction.pricePerKg.toFixed(0)}
                  </Text>
                  <Text style={styles.cardTitle}>LKR</Text>
                </View>
              </View>
              <View style={styles.rightRowatPaddy}>
                <Text style={styles.smallTitle}>Latest Transaction</Text>
                <Text style={styles.paddyName}>
                  {latestTransaction.paddyName}
                </Text>
                <Text style={styles.paddyCode}>
                  Farmer: {farmerName}
                </Text>
                <Text style={styles.paddyWeight}>
                  {latestTransaction.buyNumofBags} bags
                </Text>
                <Text style={styles.paddyCode}>
                  {formatDate(latestTransaction.createdAt)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.paddycard}>
              <View style={styles.leftRow}>
                <Image source={paddy} style={{ width: 163, height: 163 }} />
                <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.lkr}>LKR</Text>
                </View>
                <Text style={styles.cityText}>No Transactions Yet</Text>
              </View>
              <View style={styles.rightRowatPaddy}>
                <Text style={styles.smallTitle}>No Data</Text>
                <Text style={styles.paddyName}>-</Text>
                <Text style={styles.paddyCode}>-</Text>
                <Text style={styles.paddyWeight}>0 bags</Text>
              </View>
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{paddyPriceItems.length}</Text>
              <Text style={styles.statLabel}>Active Crops</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{harvestsReady}</Text>
              <Text style={styles.statLabel}>Harvests Ready</Text>
            </View>
          </View>

          {/* Latest Transaction Details */}
          {latestTransaction && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest Transaction Details</Text>
              <Text style={styles.cardContent}>• Paddy: {latestTransaction.paddyName}</Text>
              <Text style={styles.cardContent}>• Farmer: {farmerName}</Text>
              <Text style={styles.cardContent}>• Bags: {latestTransaction.buyNumofBags}</Text>
              <Text style={styles.cardContent}>• Price: LKR {latestTransaction.price.toFixed(2)}</Text>
              <Text style={styles.cardContent}>• Per kg: LKR {latestTransaction.pricePerKg.toFixed(2)}</Text>
              <Text style={styles.cardContent}>• Date: {formatDate(latestTransaction.createdAt)}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: 16,
    gap: 8,
  },
  coverImg: {
    width: 72,
    height: 72,
    borderRadius: 26,
    objectFit: 'cover',
  },
  hederTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 24,
  },
  hederText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    marginBottom: 16,
  },
  bodyLargeTitle: {
    color: '#759226',
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
    fontSize: 18,
  },
  bodyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  bodySubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 5,
    fontFamily: 'Inter-Regular',
  },
  imgcontainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'space-between',
  },
  imgRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
  cityText: {
    color: '#ADADAD',
    fontSize: 12,
  },
  rightRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  smallTitle: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  paddyName: {
    color: '#000',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    textTransform: 'capitalize',
  },
  MTitle: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  paddyCode: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    textTransform: 'capitalize',
  },
  paddyWeight: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 24,
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paddycard: {
    backgroundColor: '#E2E2E2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    minHeight: 200,
  },
  leftRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  rightRowatPaddy: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
  },
  cardprice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#759226',
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
  },
  cardContent: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flex: 0.48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#759226',
    fontFamily: 'Inter-Bold',
  },
  lkr: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});