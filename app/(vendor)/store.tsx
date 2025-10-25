import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import AddStockFarmer from '@/components/AddStockFarmer';
import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2; 
const CARD_HEIGHT = 180;

type PaddyItem = {
  id: string;
  name: string;
  paddycode: string;
  [key: string]: any;
};

const Store = () => {
  const router = useRouter();
  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ispopup,setIsPopup] = useState<boolean>(false);
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

  const fetchPaddyItems = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'farmer_paddy'),where('isSell', '==', false));
      const querySnapshot = await getDocs(q);
      const items: PaddyItem[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PaddyItem));
      setPaddyItems(items);
      console.log(`Fetched ${items.length} paddy items`);
    } catch (error) {
      console.error('Error fetching paddy items:', error);
      Alert.alert('Error', 'Failed to load paddy items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaddyItems();
  }, []);

  const handleCardPress = (item: PaddyItem) => {
    console.log('Pressed item:', item);
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
        <Text style={styles.cardSubtitle}>ID: {item.id || "N/A"}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name || "Unnamed"}
        </Text>
        <View style={{display:'flex', flexDirection:'row', justifyContent:'space-between', gap:8}}>
          <Text style={styles.cardSubtitle}>
            Code: {item.paddyCode || "N/A"}
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>STORE</Text>
      </View>

      

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
      {ispopup && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={ispopup}
          onRequestClose={() => setIsPopup(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                width: "90%",
                height: 500,
                backgroundColor: "white",
                borderRadius: 10,
                padding: 20,
              }}
            >
              <AddStockFarmer setIspopup={setIsPopup} />
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
    paddingBottom: 24,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    textTransform: 'capitalize',
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
});
