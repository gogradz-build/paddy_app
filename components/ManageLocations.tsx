import { firestore } from '@/firebase/firebaseConfig';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  query,
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
  Tid?: number;
  locationId?: string | number;
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

interface ViewAllLocationsProps {
  setViewLocationsModal: (value: boolean) => void;
  userType: 'vendor' | 'admin';
}

const ViewAllLocations: React.FC<ViewAllLocationsProps> = ({
  setViewLocationsModal,
  userType,
}) => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | LocationType>('all');

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery, selectedFilter, locations]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      const q = query(
        locationsRef,
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

      // Sort by creation date (newest first)
      locs.sort((a, b) => {
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setLocations(locs);
      setFilteredLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = [...locations];

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(loc => loc.locationType === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(loc => {
        const tidNumber = loc.Tid !== undefined && loc.Tid !== null ? loc.Tid.toString() : '';
        return tidNumber.includes(query) ||
          loc.address?.city?.toLowerCase().includes(query) ||
          loc.address?.district?.toLowerCase().includes(query) ||
          loc.address?.street?.toLowerCase().includes(query) ||
          loc.address?.formattedAddress?.toLowerCase().includes(query) ||
          loc.userProvidedCity?.toLowerCase().includes(query) ||
          loc.userProvidedDistrict?.toLowerCase().includes(query);
      });
    }

    setFilteredLocations(filtered);
  };

  const locationTypes: { value: 'all' | LocationType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'business', label: 'Business' },
    { value: 'home', label: 'Home' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'farm', label: 'Farm' },
    { value: 'other', label: 'Other' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#759226';
      case 'manual':
        return '#FF6B6B';
      default:
        return '#999';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>All Collecting Points</Text>
      <TouchableOpacity onPress={() => setViewLocationsModal(false)}>
        <Ionicons name="close" size={28} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchAndFilters = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Tid, city, district..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      

      <View style={styles.resultInfo}>
        <Text style={styles.resultInfoText}>
          Showing {filteredLocations.length} of {locations.length} locations
        </Text>
      </View>
    </>
  );

  const getLocationNumber = (location: LocationData) => {
    if (location.Tid !== undefined && location.Tid !== null) {
      return location.Tid;
    }
    return 'N/A';
  };

  const renderLocationCard = (location: LocationData) => (
    <View key={location.id} style={styles.locationCard}>
      <View style={styles.locationNumberBadge}>
        <Text style={styles.locationNumberText}>
          {location.Tid !== undefined && location.Tid !== null ? `#${location.Tid}` : 'N/A'}
        </Text>
      </View>

      <View style={styles.statusBadgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(location.locationStatus) }]}>
          <Text style={styles.statusBadgeText}>
            {location.locationStatus === 'verified' ? 'GPS' : 'Manual'}
          </Text>
        </View>
      </View>

      <View style={styles.dividerLine} />

      <View style={styles.locationDetails}>
        <View style={styles.locationTypeRow}>
          <MaterialIcons name="location-on" size={20} color="#759226" />
          <Text style={styles.locationType}>
            {location.locationType.charAt(0).toUpperCase() + location.locationType.slice(1)}
          </Text>
        </View>

        {location.address?.street && (
          <View style={styles.detailRow}>
            <MaterialIcons name="home" size={18} color="#666" />
            <Text style={styles.detailText}>{location.address.street}</Text>
          </View>
        )}

        {(location.userProvidedCity || location.address?.city) && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-city" size={18} color="#666" />
            <Text style={styles.detailText}>
              {location.userProvidedCity || location.address?.city}
            </Text>
          </View>
        )}

        {(location.userProvidedDistrict || location.address?.district) && (
          <View style={styles.detailRow}>
            <MaterialIcons name="map" size={18} color="#666" />
            <Text style={styles.detailText}>
              {location.userProvidedDistrict || location.address?.district}
            </Text>
          </View>
        )}

        {location.address?.formattedAddress && (
          <View style={styles.fullAddressContainer}>
            <Feather name="map-pin" size={16} color="#999" />
            <Text style={styles.fullAddressText}>
              {location.address.formattedAddress}
            </Text>
          </View>
        )}
      </View>

      {(location.notes || location.deliveryInstructions) && (
        <>
          <View style={styles.dividerLine} />
          <View style={styles.additionalInfo}>
            {location.notes && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <Feather name="info" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Notes</Text>
                </View>
                <Text style={styles.infoText}>{location.notes}</Text>
              </View>
            )}

            {location.deliveryInstructions && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <Ionicons name="navigate" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Delivery Instructions</Text>
                </View>
                <Text style={styles.infoText}>{location.deliveryInstructions}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {location.coordinates && (location.coordinates.latitude !== 0 || location.coordinates.longitude !== 0) && (
        <View style={styles.coordinatesContainer}>
          <Ionicons name="navigate-circle" size={14} color="#999" />
          <Text style={styles.coordinatesText}>
            {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
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
          {renderSearchAndFilters()}
          <ScrollView 
            style={styles.locationsContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.locationsContent}
          >
            {filteredLocations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'No locations found' 
                    : 'No locations available'}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery || selectedFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Locations will appear here once users add them'}
                </Text>
              </View>
            ) : (
              filteredLocations.map(renderLocationCard)
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default ViewAllLocations;

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterContent: {
    gap: 10,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#759226',
    borderColor: '#759226',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultInfo: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  resultInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  locationsContainer: {
    flex: 1,
  },
  locationsContent: {
    paddingBottom: 20,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
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
    zIndex: 1,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  locationNumberBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#4D96FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  locationNumberText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingTop: 8,
  },
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 80,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  locationDetails: {
    gap: 10,
  },
  locationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationType: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  fullAddressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  fullAddressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
  additionalInfo: {
    gap: 10,
  },
  infoBlock: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 18,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  coordinatesText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
});