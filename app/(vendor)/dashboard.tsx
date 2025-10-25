import { db } from '@/firebase/firebaseConfig';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from 'firebase/auth';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  paddyId: string;
  paddyName: string;
  measuredQty: number;
  price: number;
  pricePerKg?: number;
  note?: string;
  createdAt?: any;
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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadUserName();
    fetchPaddyItems();
    fetchPaddyPriceItems(); 
    fetchHarvestsReady(); 
    fetchRecentTransactions(); 
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

      const q = query(
        collection(db, "farmer_paddy"),
        // where("farmerUid", "==", user.uid)
      );

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
        // where("farmerUid", "==", user.uid),
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

  
  const fetchRecentTransactions = () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        return;
      }

      const q = query(
        collection(db, "transactions"),
        where("vendorUid", "==", user.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const items: Transaction[] = querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Transaction))
            .sort((a, b) => {
              const aTime = a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.seconds || 0;
              return bTime - aTime;
            })
            .slice(0, 3); 

          setRecentTransactions(items);
          console.log(`Fetched ${items.length} recent transactions`);
        },
        (error) => {
          console.error("Error fetching transactions:", error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up transactions listener:", error);
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
              <Text style={{ color: "white" }}>28c</Text>
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
              <Text style={styles.bodyLargeTitle}>{totalHarvest} kg</Text>
            </View>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <FontAwesome5 name={"coins"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Value</Text>
              </View>
              <Text style={styles.bodyLargeTitle}>LKR {totalPrice}</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Latest Transaction Paddy Card */}
          {recentTransactions.length > 0 ? (
            <View style={styles.paddycard}>
              <View style={styles.leftRow}>
                <Image source={paddy} style={{ width: 163, height: 163 }} />
                <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                  <Text style={styles.statNumber}>
                    {recentTransactions[0].price.toFixed(0)}
                  </Text>
                  <Text style={styles.lkr}>LKR</Text>
                </View>
                <Text style={styles.cityText}>Transaction Price</Text>
                <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                  <Text style={styles.cardTitle}>Per kg:</Text>
                  <Text style={styles.cardprice}>
                    {recentTransactions[0].pricePerKg || 
                     (recentTransactions[0].price / recentTransactions[0].measuredQty).toFixed(0)}
                  </Text>
                  <Text style={styles.cardTitle}>LKR</Text>
                </View>
              </View>
              <View style={styles.rightRowatPaddy}>
                <Text style={styles.smallTitle}>Latest Transaction</Text>
                <Text style={styles.paddyName}>
                  {recentTransactions[0].paddyName}
                </Text>
                <Text style={styles.paddyCode}>
                  {recentTransactions[0].paddyId?.slice(0, 8) || 'N/A'}
                </Text>
                <Text style={styles.paddyWeight}>
                  {recentTransactions[0].measuredQty} kg
                </Text>
                <Text style={styles.paddyCode}>
                  {recentTransactions[0].createdAt
                    ? new Date(recentTransactions[0].createdAt.seconds * 1000)
                        .toLocaleDateString()
                    : new Date().toLocaleDateString()}
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
                <Text style={styles.paddyWeight}>0 kg</Text>
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

          {/* Recent Activities */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Activities</Text>
           
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <Text key={transaction.id} style={styles.cardContent}>
                  • Buy {transaction.measuredQty} kg of {transaction.paddyName}
                  {transaction.note && ` - ${transaction.note}`}
                </Text>
              ))
            ) : (
              <Text style={styles.cardContent}>No recent activities</Text>
            )}
          </View>
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
    textTransform: 'uppercase',
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