import AddTransaction from '@/components/AddTransaction';
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  pId: number;
};

const images = {
  other: require('../../assets/images/other.jpg'),
  heenati: require('../../assets/images/Heenati.jpg'),
  samba: require('../../assets/images/samba.jpg'),
  redsamba: require('../../assets/images/RedSamba.jpg'),
  kakulu: require('../../assets/images/kakulu.jpg'),
  suwandel: require('../../assets/images/Suwandel.png'),
  nadu: require('../../assets/images/Nadu.png'),
  basmathi: require('../../assets/images/Basmathi.png'),
  keerisamba: require('../../assets/images/KeeriSamba.png'),
};

const getPaddyImage = (name: string) => {
  try {
    if (!name) return images.other;
    const lower = name.toLowerCase();
    if (lower.includes('keeri') && lower.includes('samba'))
      return images.keerisamba;
    if (lower.includes('nadu')) return images.nadu;
    if (lower.includes('red') || lower.includes('ratu')) return images.redsamba;
    if (lower.includes('heenati')) return images.heenati;
    if (lower.includes('samba')) return images.samba;
    if (lower.includes('kakulu')) return images.kakulu;
    if (lower.includes('suwandel')) return images.suwandel;
    if (lower.includes('basmathi') || lower.includes('basmati'))
      return images.basmathi;
    return images.other;
  } catch (error) {
    console.error('Error getting paddy image:', error);
    return images.other;
  }
};

const transactions = () => {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;

  const [activeTab, setActiveTab] = useState<'admin' | 'vendor' | 'farmer'>('admin');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ispopup, setIsPopup] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Safe navigation
  const handleBack = useCallback(() => {
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

  // Safe transactions fetch
  const fetchFarmerTransactions = useCallback(() => {
    try {
      if (!user?.uid) {
        setLoading(false);
        setError('User not logged in');
        return;
      }

      const q = query(
        collection(db, 'transactions'),
        where('farmerUid', '==', user.uid),
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          try {
            const items: Transaction[] = querySnapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                farmerUid: String(data.farmerUid || ''),
                vendorUid: String(data.vendorUid || ''),
                paddyId: String(data.paddyId || ''),
                paddyName: String(data.paddyName || 'Unknown'),
                measuredQty: Number(data.measuredQty) || 0,
                price: Number(data.price) || 0,
                createdAt: data.createdAt,
                status: data.status || 'completed',
                pId: Number(data.pId) || 0,
              } as Transaction;
            });
            
            setTransactions(items);
            setError(null);
            setLoading(false);
            setRefreshing(false);
          } catch (error) {
            console.error('Error processing transactions:', error);
            setError('Failed to process transaction data');
            setLoading(false);
            setRefreshing(false);
          }
        },
        (error) => {
          console.error('Error fetching farmer transactions:', error);
          setError('Failed to load transactions');
          setLoading(false);
          setRefreshing(false);
          Alert.alert('Error', 'Failed to load transactions. Please check your connection.');
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up listener:', error);
      setError('Failed to initialize transactions');
      setLoading(false);
      return undefined;
    }
  }, [user?.uid]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = () => {
      if (isMounted) {
        setLoading(true);
        unsubscribe = fetchFarmerTransactions();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [fetchFarmerTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
  }, []);

  const calculateTotal = useCallback(() => {
    try {
      return transactions.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    } catch (error) {
      console.error('Error calculating total:', error);
      return 0;
    }
  }, [transactions]);

  const calculateTotalQty = useCallback(() => {
    try {
      return transactions.reduce((sum, t) => sum + (Number(t.measuredQty) || 0), 0);
    } catch (error) {
      console.error('Error calculating total quantity:', error);
      return 0;
    }
  }, [transactions]);

  const TransactionCard = useCallback(({ item }: { item: Transaction }) => {
    if (!item || !item.id) {
      return null;
    }

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <Image
          source={getPaddyImage(item.paddyName)}
          style={styles.cardImage}
          resizeMode="cover"
          onError={(error) => {
            console.error('Image loading error:', error.nativeEvent.error);
          }}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {item.status || 'completed'}
              </Text>
            </View>
            <Text style={styles.cardDate}>Today</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.pId || 'N/A'} - {item.paddyName || 'Rice Sale'}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.priceContainer}>
              <Ionicons name="leaf" size={18} color="#759226" />
              <Text style={styles.cardPrice}>
                LKR {Number(item.price || 0).toFixed(0)}
              </Text>
            </View>
            <Text style={styles.qtyText}>{Number(item.measuredQty || 0)} KG</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const addStockPress = useCallback(() => {
    try {
      setIsPopup(true);
    } catch (error) {
      console.error('Error opening modal:', error);
      Alert.alert('Error', 'Unable to open transaction form');
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#759226" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchFarmerTransactions();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{transactions.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Quantity</Text>
          <Text style={styles.statValue}>
            {calculateTotalQty().toFixed(2)} KG
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            {activeTab === 'vendor' ? 'Spent' : 'Revenue'}
          </Text>
          <Text style={styles.statValue}>
            Rs {calculateTotal().toFixed(2)}
          </Text>
        </View>
      </View>

      {/* List */}
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id || `transaction-${index}`}
          renderItem={({ item }) => <TransactionCard item={item} />}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {ispopup && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={ispopup}
          onRequestClose={() => setIsPopup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <AddTransaction setIspopup={setIsPopup} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#759226',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#759226',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    height: 100,
  },
  cardImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#759226',
  },
  qtyText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    height: 600,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
});

export default transactions;