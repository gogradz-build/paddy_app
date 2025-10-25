// AddTransaction.tsx
import { db } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddTProps {
  setIspopup: any;
}

type Farmer = {
  id: string;
  name: string;
  email?: string;
};

type PaddyItem = {
  id: string;
  name: string;
  paddyCode: string;
  qty: number;
  price: number;
  farmerUid: string;
  pId:string;
};

const AddTransaction = ({ setIspopup }: AddTProps) => {
  const auth = getAuth();
  const vendorUid = auth.currentUser?.uid;

  // State
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [paddyItems, setPaddyItems] = useState<PaddyItem[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [selectedPaddyId, setSelectedPaddyId] = useState('');
  const [selectedPaddy, setSelectedPaddy] = useState<PaddyItem | null>(null);
  const [measuredQty, setMeasuredQty] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingFarmers, setFetchingFarmers] = useState(true);
  const [fetchingPaddies, setFetchingPaddies] = useState(false);

  // Fetch all farmers
  useEffect(() => {
    fetchFarmers();
  }, []);

  // Fetch paddies when farmer is selected
  useEffect(() => {
    if (selectedFarmerId) {
      fetchFarmerPaddies(selectedFarmerId);
    } else {
      setPaddyItems([]);
      setSelectedPaddyId('');
      setSelectedPaddy(null);
    }
  }, [selectedFarmerId]);

  // Update selected paddy details and auto-fill quantity
  useEffect(() => {
    if (selectedPaddyId) {
      const paddy = paddyItems.find((p) => p.id === selectedPaddyId);
      setSelectedPaddy(paddy || null);
      // Auto-fill the quantity with paddy's qty
      if (paddy) {
        setMeasuredQty(String(paddy.qty));
      }
    } else {
      setSelectedPaddy(null);
      setMeasuredQty('');
    }
  }, [selectedPaddyId, paddyItems]);

  // Fetch all farmers from users collection (role = farmer)
  const fetchFarmers = async () => {
    try {
      setFetchingFarmers(true);
      const q = query(collection(db, 'users'), where('userType', '==', 'farmer'));
      const querySnapshot = await getDocs(q);
      const farmersList: Farmer[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email,
      }));
      setFarmers(farmersList);
    } catch (error) {
      console.error('Error fetching farmers:', error);
      Alert.alert('Error', 'Failed to load farmers');
    } finally {
      setFetchingFarmers(false);
    }
  };

  // Fetch paddies for selected farmer
  const fetchFarmerPaddies = async (farmerId: string) => {
    try {
      setFetchingPaddies(true);
      const q = query(
        collection(db, 'farmer_paddy'),
        where('farmerUid', '==', farmerId),
        where('isSell', '!=', true)
        
      );
      const querySnapshot = await getDocs(q);
      const paddies: PaddyItem[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed',
        paddyCode: doc.data().paddyCode || 'N/A',
        qty: doc.data().qty || 0,
        price: doc.data().price || 0,
        farmerUid: doc.data().farmerUid,
        pId:doc.data().id,
      }))
      
      setPaddyItems(paddies);
    } catch (error) {
      console.error('Error fetching paddies:', error);
      Alert.alert('Error', 'Failed to load farmer paddies');
    } finally {
      setFetchingPaddies(false);
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!selectedPaddy || !measuredQty) return 0;
    return selectedPaddy.price * Number(measuredQty);
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!vendorUid) {
      Alert.alert('Error', 'You must be logged in as a vendor');
      return;
    }

    if (!selectedFarmerId) {
      Alert.alert('Error', 'Please select a farmer');
      return;
    }

    if (!selectedPaddyId || !selectedPaddy) {
      Alert.alert('Error', 'Please select a paddy');
      return;
    }

    if (!measuredQty || Number(measuredQty) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (Number(measuredQty) > selectedPaddy.qty) {
      Alert.alert(
        'Error',
        `Not enough stock. Available: ${selectedPaddy.qty} KG`
      );
      return;
    }

    try {
      setLoading(true);

      // Add transaction
      await addDoc(collection(db, 'transactions'), {
        farmerUid: selectedFarmerId,
        vendorUid: vendorUid,
        paddyId: selectedPaddyId,
        paddyName: selectedPaddy.name,
        measuredQty: Number(measuredQty),
        price: calculateTotalPrice(),
        pricePerKg: selectedPaddy.price,
        note: note || '',
        status: 'completed',
        createdAt: serverTimestamp(),
        pId:selectedPaddy.pId,
      });

      Alert.alert('Success', 'Transaction added successfully!');
      const paddyRef = doc(db, "farmer_paddy", selectedPaddyId);
      await updateDoc(paddyRef, {
        isSell: true,
        updatedAt: serverTimestamp(), 
      });

      setIspopup(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <TouchableOpacity onPress={() => setIspopup(false)}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Farmer Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Select Farmer <Text style={styles.required}>*</Text>
          </Text>
          {fetchingFarmers ? (
            <ActivityIndicator size="small" color="#759226" />
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedFarmerId}
                onValueChange={(value) => setSelectedFarmerId(value)}
                style={styles.picker}
              >
                <Picker.Item label="-- Select Farmer --" value="" />
                {farmers.map((farmer) => (
                  <Picker.Item
                    key={farmer.id}
                    label={farmer.name}
                    value={farmer.id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Paddy Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Select Paddy <Text style={styles.required}>*</Text>
          </Text>
          {fetchingPaddies ? (
            <ActivityIndicator size="small" color="#759226" />
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPaddyId}
                onValueChange={(value) => setSelectedPaddyId(value)}
                style={styles.picker}
                enabled={paddyItems.length > 0}
              >
                <Picker.Item label="-- Select Paddy --" value="" />
                {paddyItems.map((paddy) => (
                  <Picker.Item
                    key={paddy.id}
                    label={`${paddy.name} (${paddy.paddyCode}) - ${paddy.qty} KG available`}
                    value={paddy.id}
                  />
                ))}
              </Picker>
            </View>
          )}
          {selectedFarmerId && paddyItems.length === 0 && !fetchingPaddies && (
            <Text style={styles.infoText}>
              No paddies available for this farmer
            </Text>
          )}
        </View>

        {/* Paddy Details (Auto Display) */}
        {selectedPaddy && (
          <View style={styles.paddyDetails}>
            <Text style={styles.detailsTitle}>Selected Paddy Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedPaddy.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Code:</Text>
              <Text style={styles.detailValue}>{selectedPaddy.paddyCode}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Available Stock:</Text>
              <Text style={styles.detailValue}>{selectedPaddy.qty} KG</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price per KG:</Text>
              <Text style={styles.detailValuePrice}>
                Rs {selectedPaddy.price.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Quantity Input */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Quantity (KG) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity in KG"
            keyboardType="numeric"
            value={measuredQty}
            onChangeText={setMeasuredQty}
            editable={false}
          />
        </View>

        {/* Total Price Display */}
        {selectedPaddy && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Price:</Text>
            <Text style={styles.totalValue}>
              Rs {calculateTotalPrice().toFixed(2)}
            </Text>
          </View>
        )}

        {/* Note (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes..."
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Add Transaction</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
  paddyDetails: {
    backgroundColor: '#F1F8E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#759226',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#759226',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  detailValuePrice: {
    fontSize: 13,
    color: '#759226',
    fontWeight: '700',
  },
  totalContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#759226',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddTransaction;