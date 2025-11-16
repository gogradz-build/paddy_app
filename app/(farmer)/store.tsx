import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import AddStockFarmer from '@/components/AddStockFarmer';
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;
const CARD_HEIGHT = 200;

type PaddyItem = {
  id: string;
  name: string;
  paddyCode: string;
  numofBag: number;
  qty: number;
  price: number;
  createdAt: any;
  pId: string; // The numeric ID stored as string in farmer_paddy
  [key: string]: any;
};

type BagSaleItem = {
  id: string;
  farmerPaddyUID: string | number;
  bagsSold: number;
  qtySold: number;
  createdAt: any;
  [key: string]: any;
};

const Store = () => {
  const router = useRouter();
  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ispopup, setIsPopup] = useState<boolean>(false);
  const [detailModal, setDetailModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<PaddyItem | null>(null);
  const [bagSales, setBagSales] = useState<BagSaleItem[]>([]);
  const [loadingBagSales, setLoadingBagSales] = useState<boolean>(false);

  const images = {
    other: require('../../assets/images/other.jpg'),
    heenati: require('../../assets/images/Heenati.jpg'),
    samba: require('../../assets/images/samba.jpg'),
    redsamba: require('../../assets/images/RedSamba.jpg'),
    kakulu: require('../../assets/images/kakulu.jpg'),
    suwandel: require('../../assets/images/Suwandel.png'),
    nadu: require('../../assets/images/Nadu.png'),
    basmathi: require('../../assets/images/Basmathi.png'),
    keerisamba: require('../../assets/images/KeeriSamba.png')
  };

  const { showToaster } = useToaster();

  const handleBack = (): void => router.back();

  const getPaddyImage = (name: string) => {
    if (!name) return images.other;
    const lower = name.toLowerCase();
    if (lower.includes('keeri') && lower.includes('samba')) return images.keerisamba;
    if (lower.includes('nadu')) return images.nadu;
    if (lower.includes('red') || lower.includes('ratu')) return images.redsamba;
    if (lower.includes('heenati')) return images.heenati;
    if (lower.includes('samba')) return images.samba;
    if (lower.includes('kakulu')) return images.kakulu;
    if (lower.includes('suwandel')) return images.suwandel;
    if (lower.includes('basmathi') || lower.includes('basmati')) return images.basmathi;
    return images.other;
  };

  const fetchBagSales = async (paddyId: string) => {
    try {
      setLoadingBagSales(true);
      setBagSales([]); // Clear previous data
      
      console.log('Searching for bag sales with pId (from farmer_paddy):', paddyId);
      console.log('Type of pId:', typeof paddyId);
      
      if (!paddyId || paddyId === '' || paddyId === '0') {
        console.log('Invalid paddyId, skipping fetch');
        setLoadingBagSales(false);
        return;
      }
      
      // Try both string and number since Firestore might store it either way
      let q = query(
        collection(db, 'bag_sales'),
        where('farmerPaddyUID', '==', paddyId)
      );

      let querySnapshot = await getDocs(q);
      
      // If not found as string, try as number
      if (querySnapshot.empty) {
        console.log('Not found as string, trying as number...');
        const numericId = Number(paddyId);
        if (!isNaN(numericId) && numericId > 0) {
          q = query(
            collection(db, 'bag_sales'),
            where('farmerPaddyUID', '==', numericId)
          );
          querySnapshot = await getDocs(q);
        }
      }

      console.log('Found bag_sales documents:', querySnapshot.docs.length);
      
      const salesData: BagSaleItem[] = querySnapshot.docs
        .map(doc => {
          try {
            const data = doc.data();
            console.log('Bag sale doc data:', doc.id, data);
            return {
              id: doc.id,
              farmerPaddyUID: data.farmerPaddyUID,
              bagsSold: Number(data.bagsSold) || 0,
              qtySold: Number(data.qtySold) || 0,
              createdAt: data.createdAt,
              ...data,
            } as BagSaleItem;
          } catch (err) {
            console.error('Error mapping bag sale:', err);
            return null;
          }
        })
        .filter((sale): sale is BagSaleItem => sale !== null);

      // Sort by creation date descending
      salesData.sort((a, b) => {
        try {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        } catch (err) {
          return 0;
        }
      });

      setBagSales(salesData);
      console.log('Fetched bag sales:', salesData);
    } catch (error) {
      console.error('Error fetching bag sales:', error);
      setBagSales([]);
    } finally {
      setLoadingBagSales(false);
    }
  };

  const fetchPaddyItems = () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user?.uid) {
        showToaster("User not logged in.", "error");
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'farmer_paddy'),
        where('farmerUid', '==', user.uid),
        where('isSell', '==', false),
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const items: PaddyItem[] = querySnapshot.docs
            .map(doc => {
              try {
                const data = doc.data();
                // Safely extract the numeric id and convert to string
                const numericId = data.id || data.pId || '';
                return {
                  id: doc.id,
                  name: data.name || 'Unnamed',
                  paddyCode: data.paddyCode || 'N/A',
                  numofBag: Number(data.numofBag) || 0,
                  qty: Number(data.qty) || 0,
                  price: Number(data.price) || 0,
                  createdAt: data.createdAt,
                  pId: String(numericId), // Store the numeric id as pId (as string)
                  ...data,
                } as PaddyItem;
              } catch (err) {
                console.error('Error mapping paddy item:', err, doc.id);
                return null;
              }
            })
            .filter((item): item is PaddyItem => item !== null && item.isSell !== true)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

          setPaddyItems(items);
          console.log('fetched items: ', { items })
          console.log(`Fetched ${items.length} paddy items for this farmer`);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching paddy items:', error);
          Alert.alert('Error', 'Failed to load paddy items.');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = fetchPaddyItems();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleCardPress = async (item: PaddyItem) => {
    try {
      console.log('Pressed item:', item);
      console.log('Item pId (numeric id from farmer_paddy):', item.pId, 'Type:', typeof item.pId);
      setSelectedItem(item);
      setDetailModal(true);
      // Use the pId (numeric id) to fetch bag sales
      if (item.pId && item.pId !== '' && item.pId !== '0') {
        await fetchBagSales(item.pId);
      } else {
        console.warn('No valid pId found for this item');
        setBagSales([]);
        setLoadingBagSales(false);
      }
    } catch (error) {
      console.error('Error in handleCardPress:', error);
      setDetailModal(true);
      setBagSales([]);
      setLoadingBagSales(false);
    }
  };

  const calculateTotals = (sales: BagSaleItem[]) => {
    try {
      if (!sales || sales.length === 0) {
        return { totalBagsSold: 0, totalQtySold: 0 };
      }
      const totalBagsSold = sales.reduce((sum, sale) => {
        const bags = Number(sale.bagsSold) || 0;
        return sum + bags;
      }, 0);
      const totalQtySold = sales.reduce((sum, sale) => {
        const qty = Number(sale.qtySold) || 0;
        return sum + qty;
      }, 0);
      return { totalBagsSold, totalQtySold };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return { totalBagsSold: 0, totalQtySold: 0 };
    }
  };

  const renderPaddyCard = ({ item }: { item: PaddyItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <Image
          source={getPaddyImage(item.name)}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <Text style={styles.cardSubtitle}>Code: {item.paddyCode || "N/A"}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name || "Unnamed"}
        </Text>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={styles.cardSubtitle}>
            Bags: {item.numofBag || "N/A"}
          </Text>
          <Text style={styles.cardSubtitle}>
            QTY: {item.qty || "N/A"}KG
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const addStockPress = () => {
    setIsPopup(true);
  };

  const closeDetailModal = () => {
    setDetailModal(false);
    setSelectedItem(null);
    setBagSales([]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>STORE</Text>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.selectBttn} onPress={addStockPress}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Add New Stock</Text>
        <View style={styles.round}>
          <Ionicons name="cube-outline" size={24} color="#759226" />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Store Items</Text>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading paddy items...</Text>
        </View>
      ) : paddyItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No paddy items found</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchPaddyItems}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paddyItems}
          renderItem={renderPaddyCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Stock Modal */}
      {ispopup && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={ispopup}
          onRequestClose={() => setIsPopup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <AddStockFarmer setIspopup={setIsPopup} />
            </View>
          </View>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailModal && selectedItem && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={detailModal}
          onRequestClose={closeDetailModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailModalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={closeDetailModal}>
                  <Ionicons name="close-circle" size={32} color="#333" />
                </TouchableOpacity>

                {/* Image */}
                <Image
                  source={getPaddyImage(selectedItem.name)}
                  style={styles.detailImage}
                  resizeMode="cover"
                />

                {/* Title */}
                <Text style={styles.detailTitle}>{selectedItem.name}</Text>

                {/* Basic Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeader}>Basic Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Paddy Code:</Text>
                    <Text style={styles.detailValue}>{selectedItem.paddyCode}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price per KG:</Text>
                    <Text style={styles.detailValue}>Rs. {selectedItem.price}</Text>
                  </View>
                </View>

                {/* Stock Summary */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeader}>Stock Summary</Text>
                  
                  {/* Total Stock */}
                  <View style={styles.stockCard}>
                    <Text style={styles.stockCardTitle}>Total Stock</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Bags:</Text>
                      <Text style={styles.detailValueBold}>{selectedItem.numofBag}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Quantity:</Text>
                      <Text style={styles.detailValueBold}>{selectedItem.qty} KG</Text>
                    </View>
                  </View>

                  {loadingBagSales ? (
                    <ActivityIndicator size="small" color="#4CAF50" />
                  ) : (
                    <>
                      {/* Sold Stock */}
                      {bagSales.length > 0 && (
                        <View style={styles.stockCard}>
                          <Text style={styles.stockCardTitle}>Sold Stock</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Bags Sold:</Text>
                            <Text style={styles.detailValueBold}>
                              {calculateTotals(bagSales).totalBagsSold}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quantity Sold:</Text>
                            <Text style={styles.detailValueBold}>
                              {calculateTotals(bagSales).totalQtySold.toFixed(2)} KG
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Available Stock */}
                      <View style={styles.availableStockCard}>
                        <Text style={styles.availableStockTitle}>Available Stock</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Available Bags:</Text>
                          <Text style={[styles.detailValueBold, styles.availableValue]}>
                            {Math.max(0, (selectedItem?.numofBag || 0) - calculateTotals(bagSales).totalBagsSold)}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Available Quantity:</Text>
                          <Text style={[styles.detailValueBold, styles.availableValue]}>
                            {Math.max(0, (selectedItem?.qty || 0) - calculateTotals(bagSales).totalQtySold).toFixed(2)} KG
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Sales History Section */}
                {bagSales.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Sales History</Text>
                    
                    {bagSales.map((sale, index) => (
                      <View key={sale.id} style={styles.saleCard}>
                        <Text style={styles.saleTitle}>Sale #{bagSales.length - index}</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Bags Sold:</Text>
                          <Text style={styles.detailValue}>{sale.bagsSold || 0}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Quantity Sold:</Text>
                          <Text style={styles.detailValue}>{(sale.qtySold || 0).toFixed(2)} KG</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Date:</Text>
                          <Text style={styles.detailValue}>
                            {sale.createdAt?.toDate ? 
                              new Date(sale.createdAt.toDate()).toLocaleDateString() : 
                              'N/A'
                            }
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {bagSales.length === 0 && !loadingBagSales && (
                  <View style={styles.detailSection}>
                    <Text style={styles.noDataText}>No sales recorded yet</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default Store;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Inter-Regular',
  },
  selectBttn: {
    backgroundColor: '#000',
    height: 65,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 16,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  round: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#444',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  listContainer: {
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    marginBottom: 8,
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
    paddingBottom: 16,
  },
  cardImage: {
    width: CARD_WIDTH - 24,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  detailModalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  stockCard: {
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  stockCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  availableStockCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  availableStockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 12,
    textAlign: 'center',
  },
  availableValue: {
    color: '#2e7d32',
    fontSize: 18,
  },
  saleCard: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});