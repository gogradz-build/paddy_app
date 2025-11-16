import { db } from '@/firebase/firebaseConfig';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToaster } from '@/assets/ui/toaster';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';

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
  paddycode: string;
  qty: number;
  price: number;
  farmerUid?: string;
  [key: string]: any;
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
  const paddy = require('../../assets/images/paddy.png');

  const [userName, setUserName] = useState('Guest');
  const [city, setCity] = useState('Unknown');
  const [loading, setLoading] = useState<boolean>(true);
  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [totalHarvest, setTotalHarvest] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { showToaster } = useToaster();

  // Safe user data loading
  const loadUserName = useCallback(async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");

      if (!userDataString) {
        console.warn("No user data found");
        setUserName("Guest");
        setCity("Unknown");
        return;
      }

      let userData: UserData;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        await AsyncStorage.removeItem("userData");
        throw new Error("Corrupted user data");
      }

      if (!userData || typeof userData !== 'object') {
        throw new Error("Invalid user data format");
      }

      setUserName(userData.name || "Guest");
      setCity(userData.city || "Unknown");
    } catch (error) {
      console.error("Error loading username:", error);
      setUserName("Guest");
      setCity("Unknown");
      showToaster("Failed to load user data", "error");
    }
  }, [showToaster]);

  // Safe paddy items fetch
  const fetchPaddyItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        setLoading(false);
        return;
      }

      const q = query(collection(db, "farmer_paddy"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);

      const items: PaddyItem[] = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: String(data.name || 'Unknown'),
            paddycode: String(data.paddycode || 'N/A'),
            qty: Number(data.qty) || 0,
            price: Number(data.price) || 0,
            farmerUid: data.farmerUid,
            ...data
          } as PaddyItem;
        })
        .filter((item) => item.farmerUid === user.uid);

      setPaddyItems(items);
      console.log(`Fetched ${items.length} paddy items for this farmer`);
    } catch (error) {
      console.error("Error fetching paddy items:", error);
      setError("Failed to load paddy items");
      Alert.alert("Error", "Failed to load paddy items. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Safe calculation
  const generateDetails = useCallback(() => {
    try {
      const tempHarvest = paddyItems.reduce(
        (sum, item) => sum + (Number(item.qty) || 0),
        0
      );
      const tempPrice = paddyItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
        0
      );

      console.log("Total harvest:", tempHarvest);
      setTotalHarvest(tempHarvest);
      setTotalPrice(tempPrice);
    } catch (error) {
      console.error("Cannot calculate total harvest", error);
      setTotalHarvest(0);
      setTotalPrice(0);
    }
  }, [paddyItems]);

  // Safe transactions fetch
  const fetchRecentTransactions = useCallback(() => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        return;
      }

      const q = query(
        collection(db, "transactions"),
        where("farmerUid", "==", user.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          try {
            const items: Transaction[] = querySnapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  farmerUid: String(data.farmerUid || ''),
                  vendorUid: String(data.vendorUid || ''),
                  paddyId: String(data.paddyId || ''),
                  paddyName: String(data.paddyName || 'Unknown'),
                  measuredQty: Number(data.measuredQty) || 0,
                  price: Number(data.price) || 0,
                  pricePerKg: data.pricePerKg ? Number(data.pricePerKg) : undefined,
                  note: data.note,
                  createdAt: data.createdAt
                } as Transaction;
              })
              .sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
              })
              .slice(0, 3);

            setRecentTransactions(items);
            console.log(`Fetched ${items.length} recent transactions`);
          } catch (error) {
            console.error("Error processing transactions:", error);
            setRecentTransactions([]);
          }
        },
        (error) => {
          console.error("Error fetching transactions:", error);
          setRecentTransactions([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up transactions listener:", error);
      return undefined;
    }
  }, []);

  // Safe date formatting
  const formatDate = useCallback((createdAt: any): string => {
    try {
      if (!createdAt || !createdAt.seconds) {
        return new Date().toLocaleDateString();
      }
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return new Date().toLocaleDateString();
    }
  }, []);

  // Safe price per kg calculation
  const calculatePricePerKg = useCallback((transaction: Transaction): string => {
    try {
      if (transaction.pricePerKg) {
        return Number(transaction.pricePerKg).toFixed(0);
      }
      if (transaction.price && transaction.measuredQty && transaction.measuredQty > 0) {
        return (transaction.price / transaction.measuredQty).toFixed(0);
      }
      return '0';
    } catch (error) {
      console.error("Error calculating price per kg:", error);
      return '0';
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let transactionUnsubscribe: (() => void) | undefined;

    const initialize = async () => {
      if (isMounted) {
        await loadUserName();
        await fetchPaddyItems();
        transactionUnsubscribe = fetchRecentTransactions();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (transactionUnsubscribe) {
        try {
          transactionUnsubscribe();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    };
  }, [loadUserName, fetchPaddyItems, fetchRecentTransactions]);

  useEffect(() => {
    generateDetails();
  }, [paddyItems, generateDetails]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#759226" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchPaddyItems}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
            source={test} 
            style={styles.coverImg}
            onError={(error) => {
              console.error("Profile image error:", error.nativeEvent.error);
            }}
          />
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
              <Image 
                source={cloude}
                onError={(error) => {
                  console.error("Weather image error:", error.nativeEvent.error);
                }}
              />
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
              <Text style={styles.bodyLargeTitle}>{totalHarvest} kg</Text>
            </View>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <FontAwesome5 name={"coins"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Price</Text>
              </View>
              <Text style={styles.bodyLargeTitle}>LKR {totalPrice.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {recentTransactions.length > 0 ? (
            <View style={styles.paddycard}>
              <View style={styles.leftRow}>
                <Image 
                  source={paddy} 
                  style={{ width: 163, height: 163 }}
                  onError={(error) => {
                    console.error("Paddy image error:", error.nativeEvent.error);
                  }}
                />
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
                    {calculatePricePerKg(recentTransactions[0])}
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
                  {recentTransactions[0].paddyId?.slice(0, 8) || "N/A"}
                </Text>
                <Text style={styles.paddyWeight}>
                  {recentTransactions[0].measuredQty} kg
                </Text>
                <Text style={styles.paddyCode}>
                  {formatDate(recentTransactions[0].createdAt)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.paddycard}>
              <View style={styles.leftRow}>
                <Image 
                  source={paddy} 
                  style={{ width: 163, height: 163 }}
                  onError={(error) => {
                    console.error("Paddy image error:", error.nativeEvent.error);
                  }}
                />
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
    paddingTop: 24
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#759226',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 24,
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: 16,
    gap: 8
  },
  coverImg: {
    width: 72,
    height: 72,
    borderRadius: 26,
    objectFit: 'cover',
  },
  hederTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 24
  },
  hederText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'column'
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
    marginBottom: 16
  },
  bodyLargeTitle: {
    color: '#759226',
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
    fontSize: 18
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
    justifyContent: 'space-between'
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
    fontSize: 14
  },
  paddyName: {
    color: '#000',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    textTransform: 'capitalize'
  },
  paddyCode: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    textTransform: 'uppercase'
  },
  paddyWeight: {
    color: '#ADADAD',
    fontFamily: 'Inter-Regular',
    fontSize: 24,
    textTransform: 'uppercase'
  },
  contentContainer: {
    padding: 8,
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
    gap: 8
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
});