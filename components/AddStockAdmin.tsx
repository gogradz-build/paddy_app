import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useToaster } from '@/assets/ui/toaster';
import { db } from '@/firebase/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddStockAdminProps{
  setIspopup: any;
}

const AddStockAdmin = ({setIspopup}: AddStockAdminProps) => {
  const [paddyName, setPaddyName] = useState<string>("");
  const [paddyCode, setPaddyCode] = useState<string>("");
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { showToaster } = useToaster();

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
      
      if (!avgPrice.trim() || isNaN(Number(avgPrice)) || Number(avgPrice) <= 0) {
        showToaster("Please enter a valid average price", "warning", 2000);
        return;
      }

      setIsLoading(true);
      
      await addDoc(collection(db, "paddy"), {
        name: paddyName.trim(),
        code: paddyCode.trim(),
        avgPrice: parseFloat(avgPrice),
        createdAt: serverTimestamp(),
      });
      
      showToaster("Paddy added successfully!", "success", 2000);
      
      // Reset form
      setPaddyName("");
      setPaddyCode("");
      setAvgPrice("");
      
      // Close modal
      setTimeout(() => {
        setIspopup(false);
      }, 500);
      
    } catch (error) {
      console.error("Error adding paddy:", error);
      showToaster("Failed to add paddy. Please try again.", "error", 2000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIspopup(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Avg Price</Text>
      </View>
      <View>
        <Text style={styles.label}>
          Paddy Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          placeholder="Kiri Samba"
          style={styles.textInputField}
          value={paddyName}
          onChangeText={setPaddyName}
          editable={!isLoading}
        />
        
        <Text style={styles.label}>
          Paddy Code <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          placeholder="PB1001"
          style={styles.textInputField}
          value={paddyCode}
          onChangeText={setPaddyCode}
          editable={!isLoading}
        />
        
        <Text style={styles.label}>
          Average Price <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          placeholder="50"
          style={styles.textInputField}
          keyboardType="numeric"
          value={avgPrice}
          onChangeText={setAvgPrice}
          editable={!isLoading}
        />
        
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleAdd}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Adding...' : 'Add Price'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default AddStockAdmin;

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
  label: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
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
});