import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import { db } from '@/firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddStockFarmerProps{
  setIspopup: any;
}

const AddStockFarmer = ({setIspopup}: AddStockFarmerProps) => {
  const [paddyName, setPaddyName] = useState<string>("");
  const [paddyCode, setPaddyCode] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [numofBag, setNumofBag] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { showToaster } = useToaster();
  const auth = getAuth();
  const user = auth.currentUser;

  // Simple numeric ID generator
  const generateNumericId = () => {
    return Math.floor(Date.now() / 1000); 
  }

  const handleAdd = async () => {
    try {
      Keyboard.dismiss();
      
      // Validation
      if (!paddyName.trim()) {
        showToaster("Paddy name is required", "warning", 2000);
        return;
      }
      
      if (!paddyCode.trim()) {
        showToaster("Paddy code is required", "warning", 2000);
        return;
      }
      
      // if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      //   showToaster("Please enter a valid price", "warning", 2000);
      //   return;
      // }
      
      if (!qty.trim() || isNaN(Number(qty)) || Number(qty) <= 0) {
        showToaster("Please enter a valid quantity", "warning", 2000);
        return;
      }
      
      if (!numofBag.trim() || isNaN(Number(numofBag)) || Number(numofBag) <= 0) {
        showToaster("Please enter valid number of bags", "warning", 2000);
        return;
      }
      
      if (!user?.uid) {
        showToaster("User not logged in", "error", 2000);
        return;
      }

      setIsLoading(true);
      
      const numericId = generateNumericId();

      await addDoc(collection(db, "farmer_paddy"), {
        id: numericId,
        farmerUid: user.uid,
        name: paddyName.trim(),
        paddyCode: paddyCode.trim(),
        // price: parseFloat(price),
        qty: parseFloat(qty),
        numofBag: parseFloat(numofBag),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isSell: false,
      });

      showToaster("Paddy added successfully!", "success", 2000);
      
      // Reset form
      setPaddyName("");
      setPaddyCode("");
      setPrice("");
      setQty("");
      setNumofBag("");
      
      // Close modal
      setTimeout(() => {
        setIspopup(false);
      }, 500);
      
    } catch (error) {
      console.error("Error adding farmer paddy:", error);
      showToaster("Failed to add paddy. Please try again.", "error", 2000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIspopup(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Paddy</Text>
      </View>
      <View>
        <Text style={styles.label}>Paddy Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="Kiri Samba"
          style={styles.textInputField}
          value={paddyName}
          onChangeText={setPaddyName}
          editable={!isLoading}
        />

        <Text style={styles.label}>Paddy Code <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="PB1001"
          style={styles.textInputField}
          value={paddyCode}
          onChangeText={setPaddyCode}
          editable={!isLoading}
        />

        {/* <Text style={styles.label}>Price (per KG) <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="50"
          style={styles.textInputField}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          editable={!isLoading}
        /> */}
        
        <Text style={styles.label}>Quantity (KG) <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="500"
          style={styles.textInputField}
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
          editable={!isLoading}
        />
        
        <Text style={styles.label}>Number of Bags <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="10"
          style={styles.textInputField}
          keyboardType="numeric"
          value={numofBag}
          onChangeText={setNumofBag}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleAdd}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Adding...' : 'Add Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default AddStockFarmer;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 16, 
    paddingTop: 28, 
    paddingBottom: 24 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  headerText: { 
    flex: 1, 
    textAlign: 'center', 
    fontSize: 24, 
    fontWeight: '600' 
  },
  label: { 
    fontSize: 14, 
    marginBottom: 4, 
    fontWeight: '600' 
  },
  required: {
    color: '#f44336',
  },
  textInputField: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: { 
    backgroundColor: '#759226', 
    borderRadius: 8, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginTop: 12, 
    marginBottom: 48 
  },
  loginButtonDisabled: { 
    backgroundColor: '#a5b366' 
  },
  loginButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});