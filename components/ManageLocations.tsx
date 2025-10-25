import { firestore } from '@/firebase/firebaseConfig';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
import React, { useEffect, useState } from 'react';
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


type LocationType = 'business' | 'home' | 'warehouse' | 'farm' | 'other';

type LocationData = {
  id: string;
  userId: string;
  userType: string;
  userName: string;
  userEmail: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  address: {
    street: string;
    streetNumber?: string;
    city: string;
    district: string;
    region?: string;
    postalCode?: string;
    country?: string;
    formattedAddress: string;
  };
  userProvidedDistrict?: string;
  userProvidedCity?: string;
  locationType: LocationType;
  isPrimary: boolean;
  isActive: boolean;
  locationStatus: string;
  notes: string;
  deliveryInstructions: string;
  createdAt: any;
  updatedAt: any;
  lastVerifiedAt?: any;
};

interface ManageLocationsProps {
  setManageLocationsModal: (value: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

type ViewMode = 'list' | 'add' | 'edit';

const ManageLocations: React.FC<ManageLocationsProps> = ({
  setManageLocationsModal,
  userId,
  userName,
  userEmail,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Edit form states
  const [editNotes, setEditNotes] = useState('');
  const [editDeliveryInstructions, setEditDeliveryInstructions] = useState('');
  const [editLocationType, setEditLocationType] = useState<LocationType>('business');
  const [editDistrict, setEditDistrict] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStreet, setEditStreet] = useState('');

  // Add form states
  const [addNotes, setAddNotes] = useState('');
  const [addDeliveryInstructions, setAddDeliveryInstructions] = useState('');
  const [addLocationType, setAddLocationType] = useState<LocationType>('business');
  const [addDistrict, setAddDistrict] = useState('');
  const [addCity, setAddCity] = useState('');
  const [addStreet, setAddStreet] = useState('');
  const [newLocationCoords, setNewLocationCoords] = useState<any>(null);
  const [newLocationAddress, setNewLocationAddress] = useState<any>(null);

  const locationTypes: { value: LocationType; label: string; icon: string }[] = [
    { value: 'business', label: 'Business', icon: 'storefront' },
    { value: 'home', label: 'Home', icon: 'home' },
    { value: 'warehouse', label: 'Warehouse', icon: 'warehouse' },
    { value: 'farm', label: 'Farm', icon: 'nature' },
    { value: 'other', label: 'Other', icon: 'location-on' },
  ];

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      const q = query(
        locationsRef,
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const locs: LocationData[] = [];

      querySnapshot.forEach((doc) => {
        locs.push({
          id: doc.id,
          ...doc.data(),
        } as LocationData);
      });

      locs.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (location: LocationData) => {
    if (location.isPrimary) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your primary location. Please set another location as primary first.'
      );
      return;
    }

    Alert.alert(
      'Delete Location',
      'Are you sure you want to delete this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(firestore, 'locations', location.id), {
                isActive: false,
                updatedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Location deleted successfully');
              loadLocations();
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Error', 'Failed to delete location');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (location: LocationData) => {
    try {
      const batch = locations.map((loc) =>
        updateDoc(doc(firestore, 'locations', loc.id), {
          isPrimary: false,
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(batch);

      await updateDoc(doc(firestore, 'locations', location.id), {
        isPrimary: true,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Primary location updated');
      loadLocations();
    } catch (error) {
      console.error('Error setting primary:', error);
      Alert.alert('Error', 'Failed to update primary location');
    }
  };

  const openEditView = (location: LocationData) => {
    setSelectedLocation(location);
    setEditNotes(location.notes || '');
    setEditDeliveryInstructions(location.deliveryInstructions || '');
    setEditLocationType(location.locationType);
    setEditDistrict(location.userProvidedDistrict || location.address?.district || '');
    setEditCity(location.userProvidedCity || location.address?.city || '');
    setEditStreet(location.address?.street || location.address?.formattedAddress || '');
    setViewMode('edit');
  };

  const handleEdit = async () => {
    if (!selectedLocation) return;

    if (!editCity || !editDistrict) {
      Alert.alert('Required Fields', 'Please fill in City and District');
      return;
    }

    try {
      const updatedAddress = {
        ...selectedLocation.address,
        street: editStreet,
        city: editCity,
        district: editDistrict,
        formattedAddress: editStreet 
          ? `${editStreet}, ${editCity}, ${editDistrict}` 
          : `${editCity}, ${editDistrict}`,
      };

      await updateDoc(doc(firestore, 'locations', selectedLocation.id), {
        notes: editNotes,
        deliveryInstructions: editDeliveryInstructions,
        locationType: editLocationType,
        userProvidedDistrict: editDistrict,
        userProvidedCity: editCity,
        address: updatedAddress,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Location updated successfully');
      setViewMode('list');
      loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location');
        setIsGettingLocation(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };

      const addressResults = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      let address = null;
      if (addressResults && addressResults.length > 0) {
        const addr = addressResults[0];
        address = {
          street: addr.street || '',
          streetNumber: addr.streetNumber || '',
          city: addr.city || addr.region || '',
          district: addr.district || addr.subregion || '',
          region: addr.region || '',
          postalCode: addr.postalCode || '',
          country: addr.country || '',
          formattedAddress: [
            addr.streetNumber,
            addr.street,
            addr.city,
            addr.district,
            addr.region,
            addr.postalCode,
            addr.country
          ].filter(Boolean).join(', '),
        };

        setAddStreet(address.street || '');
        setAddCity(address.city || '');
        setAddDistrict(address.district || '');
      }

      setNewLocationCoords(coords);
      setNewLocationAddress(address);
      setIsGettingLocation(false);

      Alert.alert('Success', 'Current location detected! You can edit the details if needed.');
      return { coords, address };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please enter manually.');
      setIsGettingLocation(false);
      return null;
    }
  };

  const openAddView = () => {
    setAddNotes('');
    setAddDeliveryInstructions('');
    setAddLocationType('business');
    setAddDistrict('');
    setAddCity('');
    setAddStreet('');
    setNewLocationCoords(null);
    setNewLocationAddress(null);
    setViewMode('add');
  };

  const handleAddLocation = async () => {
    if (!addCity || !addDistrict) {
      Alert.alert('Required Fields', 'Please fill in City and District');
      return;
    }

    try {
      const coordinates = newLocationCoords || {
        latitude: 0,
        longitude: 0,
      };

      const address = {
        street: addStreet || '',
        streetNumber: '',
        city: addCity,
        district: addDistrict,
        region: '',
        postalCode: '',
        country: '',
        formattedAddress: addStreet 
          ? `${addStreet}, ${addCity}, ${addDistrict}` 
          : `${addCity}, ${addDistrict}`,
      };

      const locationDoc = {
        userId: userId,
        userType: 'buyer',
        userName: userName,
        userEmail: userEmail,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        accuracy: coordinates.accuracy || null,
        altitude: coordinates.altitude || null,
        heading: coordinates.heading || null,
        speed: coordinates.speed || null,
        address: address,
        userProvidedDistrict: addDistrict,
        userProvidedCity: addCity,
        locationType: addLocationType,
        isPrimary: locations.length === 0,
        isActive: true,
        locationStatus: newLocationCoords ? 'verified' : 'manual',
        notes: addNotes,
        deliveryInstructions: addDeliveryInstructions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastVerifiedAt: newLocationCoords ? serverTimestamp() : null,
      };

      await addDoc(collection(firestore, 'locations'), locationDoc);
      Alert.alert('Success', 'New location added successfully');
      setViewMode('list');
      loadLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      Alert.alert('Error', 'Failed to add location');
    }
  };

  const goBackToList = () => {
    setViewMode('list');
    setSelectedLocation(null);
  };

  const renderHeader = () => {
    if (viewMode === 'list') {
      return (
        <View style={styles.header}>
          <Text style={styles.headerText}>Manage Collecting Points</Text>
          <TouchableOpacity onPress={() => setManageLocationsModal(false)}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToList} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {viewMode === 'add' ? 'Add New Location' : 'Edit Location'}
        </Text>
        <View style={{ width: 28 }} />
      </View>
    );
  };

  const renderListView = () => (
    <>
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={openAddView}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Location</Text>
      </TouchableOpacity>

      <ScrollView style={styles.locationsContainer} showsVerticalScrollIndicator={false}>
        {locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No locations saved</Text>
            <Text style={styles.emptySubText}>
              Add your first delivery location to get started
            </Text>
          </View>
        ) : (
          locations.map((location) => (
            <View key={location.id} style={styles.locationCard}>
              {location.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                </View>
              )}

              <View style={styles.locationHeader}>
                <View style={styles.locationIconContainer}>
                  <MaterialIcons
                    name={'location-pin'}
                    size={24}
                    color="#759226"
                  />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationType}>
                    {location.locationType.charAt(0).toUpperCase() +
                      location.locationType.slice(1)}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {location.address?.formattedAddress || 'Unknown address'}
                  </Text>
                  {(location.userProvidedCity || location.userProvidedDistrict) && (
                    <Text style={styles.locationSubAddress}>
                      {[location.userProvidedCity, location.userProvidedDistrict]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              {location.notes && (
                <View style={styles.notesContainer}>
                  <Feather name="info" size={14} color="#666" />
                  <Text style={styles.notesText}>{location.notes}</Text>
                </View>
              )}

              {location.deliveryInstructions && (
                <View style={styles.notesContainer}>
                  <Ionicons name="navigate" size={14} color="#666" />
                  <Text style={styles.notesText}>{location.deliveryInstructions}</Text>
                </View>
              )}

              <View style={styles.locationActions}>
                {!location.isPrimary && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetPrimary(location)}
                  >
                    <Ionicons name="star-outline" size={18} color="#759226" />
                    <Text style={styles.actionButtonText}>Set Primary</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditView(location)}
                >
                  <Feather name="edit-2" size={18} color="#4D96FF" />
                  <Text style={[styles.actionButtonText, { color: '#4D96FF' }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(location)}
                >
                  <Feather name="trash-2" size={18} color="#E62727" />
                  <Text style={[styles.actionButtonText, { color: '#E62727' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );

  const renderAddView = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <TouchableOpacity 
        style={styles.useLocationButton} 
        onPress={getCurrentLocation}
        disabled={isGettingLocation}
      >
        {isGettingLocation ? (
          <>
            <ActivityIndicator color="#4D96FF" />
            <Text style={styles.useLocationButtonText}>Getting Location...</Text>
          </>
        ) : (
          <>
            <Ionicons name="locate" size={20} color="#4D96FF" />
            <Text style={styles.useLocationButtonText}>Use Current Location (Optional)</Text>
          </>
        )}
      </TouchableOpacity>

      {newLocationAddress && (
        <View style={styles.detectedLocation}>
          <Ionicons name="location" size={20} color="#759226" />
          <View style={styles.detectedLocationInfo}>
            <Text style={styles.detectedLocationLabel}>Detected Location</Text>
            <Text style={styles.detectedLocationText}>
              {newLocationAddress.formattedAddress}
            </Text>
            <Text style={styles.detectedLocationSubText}>
              You can edit the details below if needed
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Choose Location Type</Text>
      <View style={styles.typeSelector}>
        {locationTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeOption,
              addLocationType === type.value && styles.typeOptionActive,
            ]}
            onPress={() => setAddLocationType(type.value)}
          >
            <MaterialIcons
              name={'location-city'}
              size={22}
              color={addLocationType === type.value ? '#fff' : '#759226'}
            />
            <Text
              style={[
                styles.typeOptionText,
                addLocationType === type.value && styles.typeOptionTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Location Details</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="home" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Street Address (Optional)</Text>
          <TextInput
            style={styles.inputField}
            value={addStreet}
            onChangeText={setAddStreet}
            placeholder="e.g., 123 Main Street, Building A"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="location-city" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>City *</Text>
          <TextInput
            style={styles.inputField}
            value={addCity}
            onChangeText={setAddCity}
            placeholder="Enter your city"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="map" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>District *</Text>
          <TextInput
            style={styles.inputField}
            value={addDistrict}
            onChangeText={setAddDistrict}
            placeholder="Enter your district"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Additional Information</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <Feather name="file-text" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.inputField, styles.textArea]}
            value={addNotes}
            onChangeText={setAddNotes}
            placeholder="e.g., Near the main road, next to the park"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <Ionicons name="navigate" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
          <TextInput
            style={[styles.inputField, styles.textArea]}
            value={addDeliveryInstructions}
            onChangeText={setAddDeliveryInstructions}
            placeholder="e.g., Ring the doorbell twice, Leave at the gate"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.saveButton,
          (!addCity || !addDistrict) && styles.saveButtonDisabled
        ]} 
        onPress={handleAddLocation}
        disabled={!addCity || !addDistrict}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Add Location</Text>
      </TouchableOpacity>

      {(!addCity || !addDistrict) && (
        <Text style={styles.requiredNote}>
          * City and District are required fields
        </Text>
      )}
    </ScrollView>
  );

  const renderEditView = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Location Type</Text>
      <View style={styles.typeSelector}>
        {locationTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeOption,
              editLocationType === type.value && styles.typeOptionActive,
            ]}
            onPress={() => setEditLocationType(type.value)}
          >
            <MaterialIcons
              name={'local-activity'}
              size={22}
              color={editLocationType === type.value ? '#fff' : '#759226'}
            />
            <Text
              style={[
                styles.typeOptionText,
                editLocationType === type.value && styles.typeOptionTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Location Details</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="home" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Street Address</Text>
          <TextInput
            style={styles.inputField}
            value={editStreet}
            onChangeText={setEditStreet}
            placeholder="Enter street address"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="location-city" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>City *</Text>
          <TextInput
            style={styles.inputField}
            value={editCity}
            onChangeText={setEditCity}
            placeholder="Enter city"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <MaterialIcons name="map" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>District *</Text>
          <TextInput
            style={styles.inputField}
            value={editDistrict}
            onChangeText={setEditDistrict}
            placeholder="Enter district"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Additional Information</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <Feather name="file-text" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.inputField, styles.textArea]}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Add any notes about this location"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconContainer}>
          <Ionicons name="navigate" size={20} color="#759226" />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Delivery Instructions</Text>
          <TextInput
            style={[styles.inputField, styles.textArea]}
            value={editDeliveryInstructions}
            onChangeText={setEditDeliveryInstructions}
            placeholder="Add delivery instructions"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#759226" />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      ) : (
        <>
          {viewMode === 'list' && renderListView()}
          {viewMode === 'add' && renderAddView()}
          {viewMode === 'edit' && renderEditView()}
        </>
      )}
    </View>
  );
};

export default ManageLocations;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  backButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  addButton: {
    backgroundColor: '#759226',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  locationsContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  primaryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#759226',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  locationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
  locationSubAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#759226',
    marginTop: 2,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
  },
  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 2,
    borderColor: '#4D96FF',
    borderStyle: 'dashed',
  },
  useLocationButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4D96FF',
  },
  detectedLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#759226',
  },
  detectedLocationInfo: {
    flex: 1,
  },
  detectedLocationLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detectedLocationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  detectedLocationSubText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#E8F5E9',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  inputWrapper: {
    flex: 1,
  },
  inputField: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000',
    paddingVertical: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#759226',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeOptionActive: {
    backgroundColor: '#759226',
    borderColor: '#759226',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#759226',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#759226',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  requiredNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#E62727',
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 20,
  },
});