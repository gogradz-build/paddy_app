import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import AddStockAdmin from '@/components/AddStockAdmin';
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; 
const CARD_HEIGHT = 180;

type PaddyItem = {
  id: string;
  name: string;
  code: string;
  avgPrice: number;
  createdAt: any;
  [key: string]: any; 
};

export const PricePage = () => {
  const router = useRouter();

  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ispopup, setIsPopup] = useState<boolean>(false);

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

  const getPaddyImage = useCallback((name: string) => {
    try {
      if (!name) return images.other;
      
      const lowerName = name.toLowerCase().trim();
      
      if (lowerName.includes('keeri') && lowerName.includes('samba')) {
        return images.keerisamba;
      }
      if (lowerName.includes('nadu')) return images.nadu;
      if (lowerName.includes('red') || lowerName.includes('ratu')) return images.redsamba;
      if (lowerName.includes('heenati')) return images.heenati;
      if (lowerName.includes('samba')) return images.samba;
      if (lowerName.includes('kakulu')) return images.kakulu;
      if (lowerName.includes('suwandel')) return images.suwandel;
      if (lowerName.includes('basmathi') || lowerName.includes('basmati')) return images.basmathi;
      
      return images.other;
    } catch (error) {
      console.error('Error getting paddy image:', error);
      return images.other;
    }
  }, []);

  const fetchPaddyItems = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      
      const paddyCollectionRef = collection(db, 'paddy');
      const q = query(paddyCollectionRef, orderBy('name', 'asc'));
      
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          try {
            const items: PaddyItem[] = querySnapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  name: String(data.name || 'Unknown'),
                  code: String(data.code || 'N/A'),
                  avgPrice: Number(data.avgPrice) || 0,
                  createdAt: data.createdAt,
                  ...data
                } as PaddyItem;
              })
              .filter(item => item.name !== 'Unknown');
            
            setPaddyItems(items);
            console.log(`Fetched ${items.length} paddy items`);
            setLoading(false);
          } catch (error) {
            console.error('Error processing paddy items:', error);
            setError('Failed to process items');
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching paddy items:', error);
          setError('Failed to load items');
          Alert.alert('Error', 'Failed to load paddy items.');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching paddy items:', error);
      setError('Failed to initialize');
      Alert.alert('Error', 'Failed to load paddy items. Please try again.');
      setLoading(false);
      return undefined;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = () => {
      if (isMounted) {
        unsubscribe = fetchPaddyItems();
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
  }, [fetchPaddyItems]);

  const formatDate = useCallback((createdAt: any): string => {
    try {
      const date = createdAt?.toDate
        ? createdAt.toDate()
        : new Date(createdAt);
      
      if (isNaN(date.getTime())) {
        return "No date";
      }

      return date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
        .replace(/\s/g, "-");
    } catch (error) {
      console.error('Error formatting date:', error);
      return "No date";
    }
  }, []);

  const renderPaddyCard = useCallback(({ item }: { item: PaddyItem }) => {
    if (!item || !item.id) {
      return null;
    }
   

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            source={getPaddyImage(item.name)}
            style={styles.cardImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image load error:', error.nativeEvent.error);
            }}
          />
          <View style={styles.maincard}>
            <View>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                ID: {item.code || "N/A"}
              </Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.name || "Unnamed"}
              </Text>
            </View>
            <View style={styles.secondCard}>
              <View style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                <Text style={styles.lkr}>LKR</Text>
                <Text style={styles.price}>{item.avgPrice || 0}</Text>
              </View>
              <Text style={styles.date}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [getPaddyImage, formatDate]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Prices</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading paddy prices...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Prices</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchPaddyItems}
          >
            <Text style={styles.refreshButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

   const addStockPress = () => {
    setIsPopup(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Prices</Text>
      </View>
      <TouchableOpacity style={styles.selectBttn} onPress={()=>addStockPress()}>
              <Text style={{ color: '#fff', fontSize: 16 }}>Add New Stock</Text>
              <View style={styles.round}>
                <Ionicons name="cube-outline" size={24} color="#759226" />
              </View>
            </TouchableOpacity>
      {paddyItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No price data available</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchPaddyItems}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <FlatList
            data={paddyItems}
            renderItem={renderPaddyCard}
            keyExtractor={(item, index) => item.id || `paddy-${index}`}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
      {ispopup&&(
        <Modal
          animationType="slide"
          transparent={true}
          visible={ispopup}
          onRequestClose={() => setIsPopup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <AddStockAdmin setIspopup={setIsPopup} />
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
    backgroundColor: '#fff',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 28,
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
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
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
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
  },
  cardImage: {
    width: CARD_WIDTH - 24,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
    textTransform: 'capitalize'
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase'
  },
  separator: {
    height: 8,
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
    fontFamily: 'Inter-Regular',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-Regular',
  },
  maincard: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8
  },
  secondCard: {
    backgroundColor: '#000',
    width: 72,
    borderTopLeftRadius: 24.5,
    borderBottomRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lkr: {
    color: '#4CAF50',
    fontFamily: 'Inter-Regular',
    fontSize: 12
  },
  price: {
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 12
  },
  date: {
    fontSize: 8,
    color: '#b3a5a5ff'
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
});

export default PricePage;