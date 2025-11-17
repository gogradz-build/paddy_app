import { firestore } from '@/firebase/firebaseConfig';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  getDocs
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
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Geocoded fields (will be fetched from API)
  address?: {
    street?: string;
    streetNumber?: string;
    city?: string;
    district?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string;
  };
  locationType?: LocationType;
  isPrimary?: boolean;
  isActive?: boolean;
  locationStatus?: string;
  notes?: string;
  deliveryInstructions?: string;
  createdAt?: any;
  updatedAt?: any;
  geocodingStatus?: 'loading' | 'success' | 'failed' | 'invalid_coords';
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

  // Reverse geocoding function using Nominatim API
  const reverseGeocode = async (latitude: number, longitude: number): Promise<any> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'smartpaddy/1.0.0 (com.umaaj.smartpaddy)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  // Parse geocoding response to our address format
  const parseGeocodingResponse = (data: any): LocationData['address'] => {
    if (!data || !data.address) {
      return {
        formattedAddress: 'Address not available',
        street: '',
        city: '',
        district: '',
        country: ''
      };
    }

    const addr = data.address;
    
    return {
      street: addr.road || addr.street || addr.hamlet || '',
      streetNumber: addr.house_number || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      district: addr.county || addr.state_district || addr.suburb || '',
      region: addr.state || addr.province || '',
      postalCode: addr.postcode || '',
      country: addr.country || '',
      formattedAddress: data.display_name || 'Address not available'
    };
  };

  // Determine location type based on address data
  const determineLocationType = (address: any): LocationType => {
    if (!address) return 'other';
    
    const fullAddress = address.display_name?.toLowerCase() || '';
    const amenity = address.address?.amenity?.toLowerCase() || '';
    const building = address.address?.building?.toLowerCase() || '';

    if (amenity.includes('warehouse') || building.includes('warehouse')) {
      return 'warehouse';
    } else if (amenity.includes('farm') || fullAddress.includes('farm')) {
      return 'farm';
    } else if (amenity.includes('commercial') || amenity.includes('shop') || amenity.includes('office')) {
      return 'business';
    } else if (building.includes('residential') || address.address?.residential) {
      return 'home';
    }
    
    return 'other';
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      // Get all documents since we only have Tid and coordinates
      const querySnapshot = await getDocs(locationsRef);
      const locs: LocationData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        locs.push({
          id: doc.id,
          Tid: data.Tid,
          coordinates: data.coordinates || { latitude: 0, longitude: 0 },
          geocodingStatus: 'loading',
          createdAt: data.createdAt,
          isActive: true, // Set default value
        } as LocationData);
      });

      // Sort by creation date (newest first)
      locs.sort((a, b) => {
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setLocations(locs);
      setFilteredLocations(locs);

      // Fetch geocoding data for each location
      await fetchGeocodingForAllLocations(locs);

    } catch (error) {
      console.error('Error loading locations:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeocodingForAllLocations = async (locs: LocationData[]) => {
    const updatedLocations = [...locs];

    for (let i = 0; i < updatedLocations.length; i++) {
      const location = updatedLocations[i];
      const { latitude, longitude } = location.coordinates;

      // Check if coordinates are valid
      if (latitude === 0 && longitude === 0) {
        updatedLocations[i] = {
          ...location,
          geocodingStatus: 'invalid_coords',
          address: {
            formattedAddress: 'Invalid coordinates (0, 0)',
            street: 'N/A',
            city: 'N/A',
            district: 'N/A',
            country: 'N/A'
          },
          locationType: 'other',
          locationStatus: 'manual'
        };
      } else {
        // Fetch geocoding data
        const geocodedData = await reverseGeocode(latitude, longitude);
        
        if (geocodedData) {
          const parsedAddress = parseGeocodingResponse(geocodedData);
          const locationType = determineLocationType(geocodedData);
          
          updatedLocations[i] = {
            ...location,
            geocodingStatus: 'success',
            address: parsedAddress,
            locationType: locationType,
            locationStatus: 'verified'
          };
        } else {
          updatedLocations[i] = {
            ...location,
            geocodingStatus: 'failed',
            address: {
              formattedAddress: 'Unable to fetch address',
              street: 'N/A',
              city: 'N/A',
              district: 'N/A',
              country: 'N/A'
            },
            locationType: 'other',
            locationStatus: 'manual'
          };
        }
      }

      // Update state progressively to show results as they load
      setLocations([...updatedLocations]);
      setFilteredLocations([...updatedLocations]);

      // Add delay to respect API rate limits (1 request per second for Nominatim)
      if (i < updatedLocations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
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
          loc.address?.formattedAddress?.toLowerCase().includes(query);
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

  const getStatusColor = (status?: string) => {
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

  const renderLocationCard = (location: LocationData) => {
    const isLoading = location.geocodingStatus === 'loading';
    const hasInvalidCoords = location.geocodingStatus === 'invalid_coords';

    return (
      <View key={location.id} style={styles.locationCard}>
        <View style={styles.locationNumberBadge}>
          <Text style={styles.locationNumberText}>
            {location.Tid !== undefined && location.Tid !== null ? `#${location.Tid}` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statusBadgeContainer}>
          {isLoading ? (
            <View style={[styles.statusBadge, { backgroundColor: '#999' }]}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(location.locationStatus) }]}>
              <Text style={styles.statusBadgeText}>
                {location.locationStatus === 'verified' ? 'GPS' : 'Manual'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dividerLine} />

        {isLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#759226" />
            <Text style={styles.loadingText}>Fetching address details...</Text>
          </View>
        ) : hasInvalidCoords ? (
          <View style={styles.errorSection}>
            <Ionicons name="warning" size={24} color="#FF6B6B" />
            <Text style={styles.errorText}>Invalid Coordinates</Text>
            <Text style={styles.errorSubText}>Both latitude and longitude are 0</Text>
          </View>
        ) : (
          <View style={styles.locationDetails}>
            <View style={styles.locationTypeRow}>
              <MaterialIcons name="location-on" size={20} color="#759226" />
              <Text style={styles.locationType}>
                {location.locationType 
                  ? location.locationType.charAt(0).toUpperCase() + location.locationType.slice(1)
                  : 'Unknown'}
              </Text>
            </View>

            {location.address?.street && (
              <View style={styles.detailRow}>
                <MaterialIcons name="home" size={18} color="#666" />
                <Text style={styles.detailText}>{location.address.street}</Text>
              </View>
            )}

            {location.address?.city && (
              <View style={styles.detailRow}>
                <MaterialIcons name="location-city" size={18} color="#666" />
                <Text style={styles.detailText}>{location.address.city}</Text>
              </View>
            )}

            {location.address?.district && (
              <View style={styles.detailRow}>
                <MaterialIcons name="map" size={18} color="#666" />
                <Text style={styles.detailText}>{location.address.district}</Text>
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
        )}

        {!hasInvalidCoords && location.coordinates && (
          <View style={styles.coordinatesContainer}>
            <Ionicons name="navigate-circle" size={14} color="#999" />
            <Text style={styles.coordinatesText}>
              {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    );
  };

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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
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
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  errorSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B6B',
  },
  errorSubText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#999',
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