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
  where
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
  pId: number;
  totalBags: number;
};

type MeasurementItem = {
  id: string; 
  price: number;
  buyNumofBags?: number;
  farmerPaddyUID: number | string; 
  createdAt: any;
  [key: string]: any;
};

type BagSaleRecord = {
  id: string;
  farmerPaddyUID: number;
  bagsSold: number;
  qtySold: number;
  createdAt: any;
  [key: string]: any;
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
  const [buyNumofBags, setBuyNumofBags] = useState('');
  const [latestMeasurement, setLatestMeasurement] = useState<MeasurementItem | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [totalSoldBags, setTotalSoldBags] = useState(0);
  const [totalSoldQty, setTotalSoldQty] = useState(0);
  const [remainingBags, setRemainingBags] = useState(0);
  const [remainingQty, setRemainingQty] = useState(0);

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

  // Update selected paddy details
  useEffect(() => {
    if (selectedPaddyId) {
      const paddy = paddyItems.find((p) => p.id === selectedPaddyId);
      setSelectedPaddy(paddy || null);
      if (paddy) {
        console.log('Selected paddy:', paddy);
        console.log('Will fetch measurement using pId:', paddy.pId);
        // Fetch latest measurement and calculate sold bags using pId
        if (paddy.pId) {
          fetchLatestMeasurement(paddy.pId);
          calculateSoldBagsAndQty(paddy.pId, paddy.totalBags, paddy.qty);
        }
      }
    } else {
      setSelectedPaddy(null);
      setMeasuredQty('');
      setBuyNumofBags('');
      setLatestMeasurement(null);
      setTotalSoldBags(0);
      setTotalSoldQty(0);
      setRemainingBags(0);
      setRemainingQty(0);
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
      setFarmers([]);
    } finally {
      setFetchingFarmers(false);
    }
  };

  // Fetch paddies for selected farmer
  const fetchFarmerPaddies = async (farmerId: string) => {
    if (!farmerId) {
      setPaddyItems([]);
      return;
    }
    
    try {
      setFetchingPaddies(true);
      const q = query(
        collection(db, 'farmer_paddy'),
        where('farmerUid', '==', farmerId),
        where('isSell', '!=', true)
      );
      const querySnapshot = await getDocs(q);
      const paddies: PaddyItem[] = querySnapshot.docs
        .map((doc) => {
          try {
            const data = doc.data();
            console.log('Paddy document:', doc.id, data);
            
            // Ensure all required fields are present and valid
            const pId = Number(data.id) || 0;
            const totalBags = Number(data.numofBag) || 0;
            
            // Skip if critical data is missing
            if (!pId || totalBags === 0) {
              console.warn('Skipping paddy with missing data:', doc.id);
              return null;
            }
            
            return {
              id: doc.id,
              name: data.name || 'Unnamed',
              paddyCode: data.paddyCode || 'N/A',
              qty: Number(data.qty) || 0,
              price: Number(data.price) || 0,
              farmerUid: data.farmerUid || '',
              pId: pId,
              totalBags: totalBags,
            };
          } catch (err) {
            console.error('Error mapping paddy doc:', err);
            return null;
          }
        })
        .filter((p): p is PaddyItem => p !== null);

      console.log('Fetched paddies:', paddies);
      setPaddyItems(paddies);
    } catch (error) {
      console.error('Error fetching paddies:', error);
      setPaddyItems([]);
    } finally {
      setFetchingPaddies(false);
    }
  };

  // Calculate total bags and quantity sold from bag_sales collection
  const calculateSoldBagsAndQty = async (
    paddyItemId: number, 
    totalBags: number,
    totalQty: number
  ) => {
    if (!paddyItemId || paddyItemId === 0) {
      setTotalSoldBags(0);
      setTotalSoldQty(0);
      setRemainingBags(totalBags);
      setRemainingQty(totalQty);
      return;
    }

    try {
      console.log('Calculating sold bags and qty for pId:', paddyItemId);
      
      // Query bag_sales collection for this paddy
      let q = query(
        collection(db, 'bag_sales'),
        where('farmerPaddyUID', '==', paddyItemId)
      );

      let querySnapshot = await getDocs(q);

      // If not found as number, try as string
      if (querySnapshot.empty) {
        q = query(
          collection(db, 'bag_sales'),
          where('farmerPaddyUID', '==', String(paddyItemId))
        );
        querySnapshot = await getDocs(q);
      }

      let soldBags = 0;
      let soldQty = 0;
      
      if (!querySnapshot.empty) {
        // Sum all bags and quantities sold
        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          soldBags += Number(data.bagsSold) || 0;
          soldQty += Number(data.qtySold) || 0;
        });
      }

      console.log('Total sold - Bags:', soldBags, 'Qty:', soldQty);
      setTotalSoldBags(soldBags);
      setTotalSoldQty(soldQty);
      setRemainingBags(totalBags - soldBags);
      setRemainingQty(totalQty - soldQty);
    } catch (error) {
      console.error('Error calculating sold bags and qty:', error);
      setTotalSoldBags(0);
      setTotalSoldQty(0);
      setRemainingBags(totalBags);
      setRemainingQty(totalQty);
    }
  };

  // Fetch latest measurement document for the selected paddy using pId (id field)
  const fetchLatestMeasurement = async (paddyItemId: number) => {
    if (!paddyItemId || paddyItemId === 0) {
      console.log('Invalid paddyItemId, skipping measurement fetch');
      setLatestMeasurement(null);
      return;
    }

    try {
      setFetchingPrice(true);
      console.log('Fetching latest measurement for pId (id field):', paddyItemId);

      // Try searching with both number and string to handle type mismatch
      let q = query(
        collection(db, 'measurements'),
        where('farmerPaddyUID', '==', paddyItemId)
      );

      let querySnapshot = await getDocs(q);

      // If not found as number, try as string
      if (querySnapshot.empty) {
        console.log('Not found as number, trying as string...');
        q = query(
          collection(db, 'measurements'),
          where('farmerPaddyUID', '==', String(paddyItemId))
        );
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        // Sort in code to get the latest document
        const measurements = querySnapshot.docs
          .map(doc => {
            try {
              return {
                id: doc.id,
                ...doc.data(),
              } as MeasurementItem;
            } catch (err) {
              console.error('Error mapping measurement:', err);
              return null;
            }
          })
          .filter((m): m is MeasurementItem => m !== null);

        // Sort by createdAt descending to get the latest
        measurements.sort((a, b) => {
          try {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
          } catch (err) {
            console.error('Error sorting measurements:', err);
            return 0;
          }
        });

        const latestMeasurement = measurements[0] || null;
        setLatestMeasurement(latestMeasurement);
        console.log('Latest measurement found:', latestMeasurement);
      } else {
        console.log('No measurement found for this paddy pId:', paddyItemId);
        setLatestMeasurement(null);
      }
    } catch (error) {
      console.error('Error fetching latest measurement:', error);
      setLatestMeasurement(null);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Calculate total price using measurement price if available, otherwise use paddy price
  const calculateTotalPrice = () => {
    try {
      if (!measuredQty) return 0;
      const qty = Number(measuredQty);
      if (isNaN(qty)) return 0;
      
      const pricePerKg = latestMeasurement?.price || selectedPaddy?.price || 0;
      const price = Number(pricePerKg);
      if (isNaN(price)) return 0;
      
      return price * qty;
    } catch (error) {
      console.error('Error calculating total price:', error);
      return 0;
    }
  };

  // Get the price per KG to display
  const getPricePerKg = () => {
    try {
      const price = latestMeasurement?.price || selectedPaddy?.price || 0;
      return Number(price) || 0;
    } catch (error) {
      console.error('Error getting price per kg:', error);
      return 0;
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
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

      if (!buyNumofBags || Number(buyNumofBags) <= 0) {
        Alert.alert('Error', 'Please enter a valid number of bags');
        return;
      }

      const requestedBags = Number(buyNumofBags);
      const requestedQty = Number(measuredQty);

      // Check if trying to sell more bags than available
      if (requestedBags > remainingBags) {
        Alert.alert(
          'Error',
          `Not enough bags available.\nRemaining bags: ${remainingBags}\nYou are trying to sell: ${requestedBags} bags`
        );
        return;
      }

      // Check if trying to sell more quantity than available
      if (requestedQty > remainingQty) {
        Alert.alert(
          'Error',
          `Not enough quantity available.\nRemaining quantity: ${remainingQty} KG\nYou are trying to sell: ${requestedQty} KG`
        );
        return;
      }

      setLoading(true);

      // Calculate new totals
      const newTotalSoldBags = totalSoldBags + requestedBags;
      const newTotalSoldQty = totalSoldQty + requestedQty;
      const allBagsSold = newTotalSoldBags >= selectedPaddy.totalBags;
      const allQtySold = newTotalSoldQty >= selectedPaddy.qty;

      console.log('Transaction details:', {
        totalBags: selectedPaddy.totalBags,
        totalQty: selectedPaddy.qty,
        previouslySoldBags: totalSoldBags,
        previouslySoldQty: totalSoldQty,
        sellingNowBags: requestedBags,
        sellingNowQty: requestedQty,
        newTotalBags: newTotalSoldBags,
        newTotalQty: newTotalSoldQty,
        allSold: allBagsSold && allQtySold
      });

      // Add transaction
      await addDoc(collection(db, 'transactions'), {
        farmerUid: selectedFarmerId,
        vendorUid: vendorUid,
        paddyId: selectedPaddyId,
        paddyName: selectedPaddy.name,
        measuredQty: requestedQty,
        price: calculateTotalPrice(),
        pricePerKg: getPricePerKg(),
        note: note.trim() || '',
        status: 'completed',
        createdAt: serverTimestamp(),
        pId: selectedPaddy.pId,
        buyNumofBags: requestedBags,
      });

      // Add record to bag_sales collection
      await addDoc(collection(db, 'bag_sales'), {
        farmerPaddyUID: selectedPaddy.pId,
        bagsSold: requestedBags,
        qtySold: requestedQty,
        vendorUid: vendorUid,
        createdAt: serverTimestamp(),
      });
      console.log('Created bag sale record for pId:', selectedPaddy.pId);

      // Create new measurement document for this transaction
      await addDoc(collection(db, 'measurements'), {
        farmerPaddyUID: selectedPaddy.pId,
        price: getPricePerKg(),
        buyNumofBags: requestedBags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('Created measurement document');

      // Update paddy - only mark as sold if ALL bags AND quantity are sold
      const shouldMarkAsSold = allBagsSold && allQtySold;
      const paddyRef = doc(db, 'farmer_paddy', selectedPaddyId);
      await updateDoc(paddyRef, {
        isSell: shouldMarkAsSold,
        updatedAt: serverTimestamp(),
      });

      if (shouldMarkAsSold) {
        Alert.alert(
          'Success', 
          `Transaction added successfully!\n\nAll ${selectedPaddy.totalBags} bags (${selectedPaddy.qty} KG) have been sold. This paddy is now marked as completely sold.`
        );
      } else {
        Alert.alert(
          'Success', 
          `Transaction added successfully!\n\nSold: ${requestedBags} bags (${requestedQty} KG)\nRemaining: ${remainingBags - requestedBags} bags (${(remainingQty - requestedQty).toFixed(2)} KG)`
        );
      }
      
      setIspopup(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
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
                    label={`${paddy.name} (${paddy.paddyCode}) - ${paddy.qty} KG, ${paddy.totalBags} bags`}
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
            
            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Quantity Stock:</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total:</Text>
                <Text style={styles.detailValue}>{selectedPaddy.qty} KG</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sold:</Text>
                <Text style={styles.detailValue}>{totalSoldQty.toFixed(2)} KG</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining:</Text>
                <Text style={[styles.detailValue, styles.remainingValue]}>
                  {remainingQty.toFixed(2)} KG
                </Text>
              </View>
            </View>

            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Bag Stock:</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total:</Text>
                <Text style={styles.detailValue}>{selectedPaddy.totalBags} bags</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sold:</Text>
                <Text style={styles.detailValue}>{totalSoldBags} bags</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining:</Text>
                <Text style={[styles.detailValue, styles.remainingValue]}>
                  {remainingBags} bags
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price per KG:</Text>
              {fetchingPrice ? (
                <ActivityIndicator size="small" color="#759226" />
              ) : (
                <View>
                  <Text style={styles.detailValuePrice}>
                    Rs {getPricePerKg().toFixed(2)}
                  </Text>
                  {latestMeasurement && (
                    <Text style={styles.priceSourceText}>
                      (From latest measurement)
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quantity Input - NOW EDITABLE */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Quantity (KG) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter quantity (Max: ${remainingQty.toFixed(2)} KG)`}
            keyboardType="numeric"
            value={measuredQty}
            onChangeText={setMeasuredQty}
            editable={!!selectedPaddy}
          />
          {selectedPaddy && remainingQty > 0 && (
            <Text style={styles.qtyInfoText}>
              Available quantity: {remainingQty.toFixed(2)} KG
            </Text>
          )}
        </View>

        {/* Number of Bags Input */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Number of Bags <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter number of bags (Max: ${remainingBags})`}
            keyboardType="numeric"
            value={buyNumofBags}
            onChangeText={setBuyNumofBags}
            editable={!!selectedPaddy}
          />
          {selectedPaddy && remainingBags > 0 && (
            <Text style={styles.bagsInfoText}>
              Available bags: {remainingBags}
            </Text>
          )}
        </View>

        {/* Total Price Display */}
        {selectedPaddy && measuredQty && (
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
  qtyInfoText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '600',
  },
  bagsInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
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
  stockSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  stockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#759226',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
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
  remainingValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  priceSourceText: {
    fontSize: 10,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'right',
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