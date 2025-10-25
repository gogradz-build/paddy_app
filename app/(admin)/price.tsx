import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import AddStockAdmin from '@/components/AddStockAdmin';
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; 
const CARD_HEIGHT = 180;
type PaddyItem = {
  id: string;
  name: string;
  paddycode: string;
  [key: string]: any; 
};

const price = () => {
  const router = useRouter();

  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
  const [ispopup,setIsPopup] = useState<boolean>(false);
    const other = require('../../assets/images/other.jpg');
    const Heenati = require('../../assets/images/Heenati.jpg');
    const samba = require('../../assets/images/samba.jpg');
    const RedSamba = require('../../assets/images/RedSamba.jpg');
    const kakulu = require('../../assets/images/kakulu.jpg');
    const Suwandel = require('../../assets/images/Suwandel.png');
    const Nadu = require('../../assets/images/Nadu.png');
    const Basmathi = require('../../assets/images/Basmathi.png');
    const KeeriSamba = require('../../assets/images/KeeriSamba.png');

   const handleBack = (): void => {
    router.back();
  };
    const getPaddyImage = (name: string) => {
    if (!name) return other;
    
    const lowerName = name.toLowerCase().trim();
    
   
    if (lowerName.includes('keeri') && lowerName.includes('samba')) {
      return KeeriSamba;
    }
    if (lowerName.includes('nadu')) {
      return Nadu;
    }
    if (lowerName.includes('red') || lowerName.includes('ratu')) {
      return RedSamba;
    }
    if (lowerName.includes('heenati')) {
      return Heenati;
    }
    if (lowerName.includes('samba')) {
      return samba;
    }
    if (lowerName.includes('kakulu')) {
      return kakulu;
    }
    if (lowerName.includes('suwandel')) {
      return Suwandel;
    }
    if (lowerName.includes('basmathi') || lowerName.includes('basmati')) {
      return Basmathi;
    }
    
   
    return other;
  };

  const fetchPaddyItems = async () => {
    try {
      setLoading(true);
      const paddyCollectionRef = collection(db, 'paddy');
      const q = query(paddyCollectionRef, orderBy('name', 'asc'));
      
      const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: PaddyItem[] = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as PaddyItem))
          
        
        setPaddyItems(items);
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
      console.error(' Error fetching paddy items:', error);
      Alert.alert('Error', 'Failed to load paddy items. Please try again.');
    } finally {
      setLoading(false);
    }
  };
   useEffect(() => {
      fetchPaddyItems();
    }, []);
    const renderLoading = () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading paddy items...</Text>
      </View>
    );
  
    const renderEmptyState = () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No paddy items found</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchPaddyItems}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
    const formatDate = (createdAt: any): string => {
      try {
        const date = createdAt?.toDate
          ? createdAt.toDate()
          : new Date(createdAt);
        return date
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })
          .replace(/\s/g, "-");
      } catch {
        return "No date";
      }
    };
    const renderPaddyCard = ({ item }: { item: PaddyItem }) => (
      <View style={styles.card} >
        <View style={styles.cardContent}>
          <Image
            source={getPaddyImage(item.name)}
            style={styles.cardImage}
            resizeMode="cover"
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
                <Text style={styles.price}>{item.avgPrice}</Text>
              </View>
              <Text style={styles.date}>
               {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );


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
      {/* Add Button */}
      <TouchableOpacity style={styles.selectBttn} onPress={addStockPress}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Add New Price</Text>
        <View style={styles.round}>
          <Ionicons name="cube-outline" size={24} color="#759226" />
        </View>
      </TouchableOpacity>
      {loading ? (
        renderLoading()
      ) : paddyItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.content}>
          <FlatList
            data={paddyItems}
            renderItem={renderPaddyCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
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
              <AddStockAdmin setIspopup={setIsPopup} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default price

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
    fontFamily: 'Inter-Regular',
    fontSize: 24,
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
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
    textTransform:'capitalize'
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    textTransform:'uppercase'
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
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
  maincard:{
    display:'flex',
    flexDirection:'row',
    gap:8
  },
  secondCard:{
    backgroundColor:'#000',
    width:72,
    borderTopLeftRadius:24.5,
    borderBottomRightRadius:16,
    alignItems:'center',
    justifyContent:'center'
  },
  lkr:{
    color:'#4CAF50',
    fontFamily:'Inter-Regular',
    fontSize:12
  },
  price:{
    color:'#fff',
    fontFamily:'Inter-Regular',
    fontSize:12
  },
  date:{
    fontSize:8,
    color:'#b3a5a5ff'
  }
});