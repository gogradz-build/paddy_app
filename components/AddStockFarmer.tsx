import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import { db } from '@/firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddStockFarmerProps{
  setIspopup:any;
}

const AddStockFarmer = ({setIspopup}:AddStockFarmerProps) => {
  const [paddyName, setPaddyName] = useState<string>("");
  const [paddyCode, setPaddyCode] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [qty,setQty] =useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { showToaster } = useToaster();
  const auth = getAuth();
  const user = auth.currentUser;

  // Simple numeric ID generator
  const generateNumericId = () => {
    return Math.floor(Date.now() / 1000); 
  }

  const handleAdd = async () => {
    Keyboard.dismiss();
    if (!paddyName.trim() || !paddyCode.trim() || !price.trim()) {
      showToaster("Paddy Details Can't Be Empty.", "warning", 2000);
      return;
    }
    if (!user?.uid) {
      showToaster("User not logged in.", "error", 2000);
      return;
    }

    setIsLoading(true);
    try {
      const numericId = generateNumericId();

      await addDoc(collection(db, "farmer_paddy"), {
        id: numericId,
        farmerUid: user.uid,
        name: paddyName.trim(),
        paddyCode: paddyCode.trim(),
        price: parseFloat(price),
        qty: parseFloat(qty),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isSell:false
      });

      showToaster("Paddy added successfully!", "success", 2000);
      setPaddyName("");
      setPaddyCode("");
      setPrice("");
      setQty("");
      setIspopup(false);
    } catch (error) {
      console.error("Error adding farmer paddy:", error);
      showToaster("Failed to add paddy.", "error", 2000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIspopup(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Paddy</Text>
      </View>
      <View>
        <Text style={styles.label}>Paddy Name</Text>
        <TextInput
          placeholder="Kiri Samba"
          style={styles.textInputField}
          value={paddyName}
          onChangeText={setPaddyName}
        />

        <Text style={styles.label}>Paddy Code</Text>
        <TextInput
          placeholder="PB1001"
          style={styles.textInputField}
          value={paddyCode}
          onChangeText={setPaddyCode}
        />

        <Text style={styles.label}>Price</Text>
        <TextInput
          placeholder="50"
          style={styles.textInputField}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <Text style={styles.label}>QTY</Text>
        <TextInput
          placeholder="10"
          style={styles.textInputField}
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleAdd}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>Add Stock</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default AddStockFarmer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 28 , paddingBottom:24},
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerText: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '600' },
  label: { fontSize: 14, marginBottom: 4, fontWeight: '600' },
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
  loginButton: { backgroundColor: '#759226', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 , marginBottom:48},
  loginButtonDisabled: { backgroundColor: '#a5b366' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
