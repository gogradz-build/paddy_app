import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import { db } from '@/firebase/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddStockAdminProps{
  setIspopup:any;
}
const AddStockAdmin = ({setIspopup}:AddStockAdminProps) => {
  const [paddyName,setPaddyName] = useState<string>("");
  const [paddyCode,setPaddyCode] =useState<string>("");
  const [avgPrice,setAvgPrice] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { showToaster } = useToaster();

  const handleAdd=async ()=>{
    Keyboard.dismiss();
    if (paddyName.trim() === "" || paddyCode.trim() === ""||avgPrice.trim() === "") {
      showToaster("Paddy Details Can't Be Empty.", "warning", 2000);
    }
    setIsLoading(true);
    try {
      await addDoc(collection(db, "paddy"), {
        name: paddyName.trim(),
        code: paddyCode.trim(),
        avgPrice: parseFloat(avgPrice),
        createdAt: serverTimestamp(),
      });
      showToaster("Paddy added successfully!", "success", 2000);
      setPaddyName("");
      setPaddyCode("");
      setAvgPrice("");
      setIspopup(false);
    } catch (error) {
      console.error("Error adding paddy:", error);
      showToaster("Failed to add paddy.", "error", 2000);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIspopup(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Avg Price</Text>
      </View>
      <View>
        <Text style={styles.label}>Paddy Name</Text>
        <TextInput
          placeholder="Kiri Samba"
          style={styles.textInputField}
          autoCapitalize="none"
          value={paddyName}
          onChangeText={setPaddyName}
        />
        <Text style={styles.label}>Paddy Code</Text>
        <TextInput
          placeholder="PB1001"
          style={styles.textInputField}
          autoCapitalize="none"
          value={paddyCode}
          onChangeText={setPaddyCode}
        />
        <Text style={styles.label}>Avg Price</Text>
        <TextInput
          placeholder="50"
          style={styles.textInputField}
          autoCapitalize="none"
          keyboardType="number-pad"
          value={avgPrice}
          onChangeText={setAvgPrice}
        />
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleAdd}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>Add Price</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default AddStockAdmin
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 28,
    width:'auto'
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
  itemCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  listContainer: {
    paddingBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  textInputField: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
    loginButton: {
    backgroundColor: '#759226',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    backgroundColor: '#a5b366',
  },
    loginButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
})