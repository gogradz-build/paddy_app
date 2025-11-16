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

type FarmerLocationData = {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerEmail: string;
  userType: string;
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
  farmDistrict?: string;
  farmCity?: string;
  farmAddress?: string;
  locationType: string;
  locationStatus: string;
  isActive: boolean;
  isPrimaryFarmLocation: boolean;
  gpsVerified: boolean;
  verificationMethod?: string;
  locationVisibility?: string;
  showExactLocation?: boolean;
  farmNotes?: string;
  farmSize?: string;
  farmType?: string;
  accessInstructions?: string;
  createdAt: any;
  updatedAt: any;
  lastVerifiedAt?: any;
  registrationDate?: any;
};

interface ViewFarmerLocationsProps {
  setViewFarmerLocationsModal: (value: boolean) => void;
}

const ViewFarmerLocations: React.FC<ViewFarmerLocationsProps> = ({
  setViewFarmerLocationsModal,
}) => {
  const [locations, setLocations] = useState<FarmerLocationData[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<FarmerLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFarmerLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery, locations]);

  const loadFarmerLocations = async () => {
    setLoading(true);
    try {
      const farmerLocationsRef = collection(firestore, 'farmer_location');
      const q = query(
        farmerLocationsRef,
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const locs: FarmerLocationData[] = [];

      querySnapshot.forEach((doc) => {
        locs.push({
          id: doc.id,
          ...doc.data(),
        } as FarmerLocationData);
      });

      // Sort by creation date (newest first)
      locs.sort((a, b) => {
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setLocations(locs);
      setFilteredLocations(locs);
    } catch (error) {
      console.error('Error loading farmer locations:', error);
      Alert.alert('Error', 'Failed to load farmer locations');
    } finally {
      setLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = [...locations];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(loc => 
        loc.farmerName?.toLowerCase().includes(query) ||
        loc.farmerEmail?.toLowerCase().includes(query) ||
        loc.farmCity?.toLowerCase().includes(query) ||
        loc.farmDistrict?.toLowerCase().includes(query) ||
        loc.address?.city?.toLowerCase().includes(query) ||
        loc.address?.district?.toLowerCase().includes(query) ||
        loc.address?.street?.toLowerCase().includes(query) ||
        loc.farmAddress?.toLowerCase().includes(query)
      );
    }

    setFilteredLocations(filtered);
  };

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

  const getVerificationBadgeColor = (verified: boolean) => {
    return verified ? '#4CAF50' : '#FFA726';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>Farmer Locations</Text>
      <TouchableOpacity onPress={() => setViewFarmerLocationsModal(false)}>
        <Ionicons name="close" size={28} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, city, district..."
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
          Showing {filteredLocations.length} of {locations.length} farmer locations
        </Text>
      </View>
    </>
  );

  const renderLocationCard = (location: FarmerLocationData) => (
    <View key={location.id} style={styles.locationCard}>
      {/* Verification Badge */}
      <View style={[
        styles.verificationBadge,
        { backgroundColor: getVerificationBadgeColor(location.gpsVerified) }
      ]}>
        <Ionicons 
          name={location.gpsVerified ? "checkmark-circle" : "alert-circle"} 
          size={12} 
          color="#fff" 
        />
        <Text style={styles.verificationBadgeText}>
          {location.gpsVerified ? 'GPS VERIFIED' : 'UNVERIFIED'}
        </Text>
      </View>

      {/* Farmer Info Section */}
      <View style={styles.farmerInfoSection}>
        <View style={styles.farmerInfoHeader}>
          <View style={styles.farmerIcon}>
            <MaterialIcons name="agriculture" size={24} color="#759226" />
          </View>
          <View style={styles.farmerDetails}>
            <Text style={styles.farmerName}>{location.farmerName || 'Unknown Farmer'}</Text>
            <Text style={styles.farmerEmail}>{location.farmerEmail || 'No email'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dividerLine} />

      {/* GPS Coordinates Section */}
      <View style={styles.gpsSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="navigate-circle" size={18} color="#4D96FF" />
          <Text style={styles.sectionTitle}>GPS Location</Text>
        </View>
        
        <View style={styles.gpsDetailsContainer}>
          <View style={styles.gpsRow}>
            <Text style={styles.gpsLabel}>Latitude:</Text>
            <Text style={styles.gpsValue}>
              {location.coordinates?.latitude?.toFixed(6) || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.gpsRow}>
            <Text style={styles.gpsLabel}>Longitude:</Text>
            <Text style={styles.gpsValue}>
              {location.coordinates?.longitude?.toFixed(6) || 'N/A'}
            </Text>
          </View>

          {location.accuracy && (
            <View style={styles.gpsRow}>
              <Text style={styles.gpsLabel}>Accuracy:</Text>
              <Text style={styles.gpsValue}>±{location.accuracy.toFixed(0)}m</Text>
            </View>
          )}

          {location.altitude && (
            <View style={styles.gpsRow}>
              <Text style={styles.gpsLabel}>Altitude:</Text>
              <Text style={styles.gpsValue}>{location.altitude.toFixed(0)}m</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.dividerLine} />

      {/* Farm Location Details */}
      <View style={styles.locationDetails}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="location-on" size={18} color="#759226" />
          <Text style={styles.sectionTitle}>Farm Address</Text>
        </View>

        {location.address?.street && (
          <View style={styles.detailRow}>
            <MaterialIcons name="home" size={16} color="#666" />
            <Text style={styles.detailText}>{location.address.street}</Text>
          </View>
        )}

        {(location.farmCity || location.address?.city) && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-city" size={16} color="#666" />
            <Text style={styles.detailText}>
              {location.farmCity || location.address?.city}
            </Text>
          </View>
        )}

        {(location.farmDistrict || location.address?.district) && (
          <View style={styles.detailRow}>
            <MaterialIcons name="map" size={16} color="#666" />
            <Text style={styles.detailText}>
              {location.farmDistrict || location.address?.district}
            </Text>
          </View>
        )}

        {(location.farmAddress || location.address?.formattedAddress) && (
          <View style={styles.fullAddressContainer}>
            <Feather name="map-pin" size={14} color="#999" />
            <Text style={styles.fullAddressText}>
              {location.farmAddress || location.address?.formattedAddress}
            </Text>
          </View>
        )}
      </View>

      {/* Additional Farm Information */}
      {(location.farmNotes || location.farmType || location.accessInstructions) && (
        <>
          <View style={styles.dividerLine} />
          <View style={styles.additionalInfo}>
            {location.farmType && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <MaterialIcons name="category" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Farm Type</Text>
                </View>
                <Text style={styles.infoText}>{location.farmType}</Text>
              </View>
            )}

            {location.farmSize && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <MaterialIcons name="square-foot" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Farm Size</Text>
                </View>
                <Text style={styles.infoText}>{location.farmSize}</Text>
              </View>
            )}

            {location.farmNotes && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <Feather name="info" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Notes</Text>
                </View>
                <Text style={styles.infoText}>{location.farmNotes}</Text>
              </View>
            )}

            {location.accessInstructions && (
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <Ionicons name="navigate" size={14} color="#666" />
                  <Text style={styles.infoLabel}>Access Instructions</Text>
                </View>
                <Text style={styles.infoText}>{location.accessInstructions}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Metadata Footer */}
      <View style={styles.metadataFooter}>
        <View style={styles.metadataItem}>
          <Ionicons name="time-outline" size={12} color="#999" />
          <Text style={styles.metadataText}>
            Registered: {formatDate(location.registrationDate || location.createdAt)}
          </Text>
        </View>
        
        {location.verificationMethod && (
          <View style={styles.metadataItem}>
            <MaterialIcons name="verified" size={12} color="#999" />
            <Text style={styles.metadataText}>
              Method: {location.verificationMethod}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#759226" />
          <Text style={styles.loadingText}>Loading farmer locations...</Text>
        </View>
      ) : (
        <>
          {renderSearchBar()}
          <ScrollView 
            style={styles.locationsContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.locationsContent}
          >
            {filteredLocations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="agriculture" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No farmers found' : 'No farmer locations available'}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Farmer locations will appear here once they register'}
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

export default ViewFarmerLocations;

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
  verificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  verificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  farmerInfoSection: {
    marginBottom: 12,
    paddingRight: 100,
  },
  farmerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#E8F5E9',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  farmerDetails: {
    flex: 1,
  },
  farmerName: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  farmerEmail: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  gpsSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gpsDetailsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  gpsValue: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#000',
    fontWeight: '500',
  },
  locationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
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
    fontSize: 11,
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
  metadataFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 6,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
});