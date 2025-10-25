import { firestore } from '@/firebase/firebaseConfig';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
    TouchableOpacity,
    View,
} from 'react-native';

type LocationType = 'business' | 'home' | 'warehouse' | 'farm' | 'other';

type CollectionPoint = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userType: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    street: string;
    city: string;
    district: string;
    formattedAddress: string;
  };
  locationType: LocationType;
  isPrimary: boolean;
  locationStatus: string;
  notes: string;
  deliveryInstructions: string;
  createdAt: any;
};

interface CollectionPointsProps {
  setCollectionPointsModal: (value: boolean) => void;
}

const CollectionPoints: React.FC<CollectionPointsProps> = ({
  setCollectionPointsModal,
}) => {
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    loadCollectionPoints();
  }, []);

  const loadCollectionPoints = async () => {
    setLoading(true);
    try {
      const locationsRef = collection(firestore, 'locations');
      
      // Query for vendor/buyer locations that are active
      const q = query(
        locationsRef,
        where('isActive', '==', true),
        where('userType', 'in', ['buyer', 'vendor'])
      );

      const querySnapshot = await getDocs(q);
      const points: CollectionPoint[] = [];
      const districtSet = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        points.push({
          id: doc.id,
          ...data,
        } as CollectionPoint);

        // Collect unique districts
        if (data.address?.district) {
          districtSet.add(data.address.district);
        }
      });

      // Sort by primary first, then by creation date
      points.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setCollectionPoints(points);
      setDistricts(['all', ...Array.from(districtSet).sort()]);
    } catch (error) {
      console.error('Error loading collection points:', error);
      Alert.alert('Error', 'Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPoints = () => {
    if (selectedDistrict === 'all') {
      return collectionPoints;
    }
    return collectionPoints.filter(
      point => point.address?.district === selectedDistrict
    );
  };

  const getLocationIcon = (type: LocationType) => {
    const iconMap: Record<LocationType, string> = {
      business: 'storefront',
      home: 'home',
      warehouse: 'warehouse',
      farm: 'nature',
      other: 'location-on',
    };
    return iconMap[type] || 'location-on';
  };

  const getLocationColor = (type: LocationType) => {
    const colorMap: Record<LocationType, string> = {
      business: '#4D96FF',
      home: '#FF6B6B',
      warehouse: '#A66DD4',
      farm: '#6BCB77',
      other: '#FFD93D',
    };
    return colorMap[type] || '#759226';
  };

  const handleCallVendor = (point: CollectionPoint) => {
    Alert.alert(
      'Contact Vendor',
      `Would you like to contact ${point.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => Alert.alert('Email', point.userEmail),
        },
      ]
    );
  };

  const filteredPoints = getFilteredPoints();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerText}>Collection Points</Text>
          <Text style={styles.headerSubText}>
            Available vendor locations for product collection
          </Text>
        </View>
        <TouchableOpacity onPress={() => setCollectionPointsModal(false)}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#759226" />
          <Text style={styles.loadingText}>Loading collection points...</Text>
        </View>
      ) : (
        <>
          {/* District Filter */}
          {districts.length > 1 && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter by District:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                {districts.map((district) => (
                  <TouchableOpacity
                    key={district}
                    style={[
                      styles.filterChip,
                      selectedDistrict === district && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedDistrict(district)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedDistrict === district && styles.filterChipTextActive,
                      ]}
                    >
                      {district === 'all' ? 'All Districts' : district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="location-on" size={24} color="#759226" />
              <View>
                <Text style={styles.statNumber}>{filteredPoints.length}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="people" size={24} color="#4D96FF" />
              <View>
                <Text style={styles.statNumber}>
                  {new Set(filteredPoints.map(p => p.userId)).size}
                </Text>
                <Text style={styles.statLabel}>Vendors</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="map" size={24} color="#FF6B6B" />
              <View>
                <Text style={styles.statNumber}>
                  {new Set(filteredPoints.map(p => p.address?.district)).size}
                </Text>
                <Text style={styles.statLabel}>Districts</Text>
              </View>
            </View>
          </View>

          {/* Collection Points List */}
          <ScrollView
            style={styles.pointsContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredPoints.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No collection points found</Text>
                <Text style={styles.emptySubText}>
                  {selectedDistrict === 'all'
                    ? 'There are no active collection points at the moment'
                    : `No collection points available in ${selectedDistrict}`}
                </Text>
              </View>
            ) : (
              filteredPoints.map((point) => (
                <View
                  key={point.id}
                  style={[
                    styles.pointCard,
                    { borderLeftColor: getLocationColor(point.locationType) },
                  ]}
                >
                  {point.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}

                  <View style={styles.pointHeader}>
                    <View
                      style={[
                        styles.pointIconContainer,
                        { backgroundColor: getLocationColor(point.locationType) + '20' },
                      ]}
                    >
                      <MaterialIcons
                        name={'location-city'}
                        size={24}
                        color={getLocationColor(point.locationType)}
                      />
                    </View>
                    <View style={styles.pointInfo}>
                      <Text style={styles.vendorName}>{point.userName}</Text>
                      <View style={styles.typeContainer}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: getLocationColor(point.locationType) },
                          ]}
                        >
                          <Text style={styles.typeBadgeText}>
                            {point.locationType.charAt(0).toUpperCase() +
                              point.locationType.slice(1)}
                          </Text>
                        </View>
                        {point.locationStatus === 'verified' && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#6BCB77" />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Address Section */}
                  <View style={styles.addressSection}>
                    <View style={styles.addressRow}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.addressText}>
                        {point.address?.formattedAddress || 'Address not available'}
                      </Text>
                    </View>
                    {(point.address?.city || point.address?.district) && (
                      <View style={styles.addressRow}>
                        <MaterialIcons name="place" size={16} color="#759226" />
                        <Text style={styles.districtText}>
                          {[point.address?.city, point.address?.district]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Notes Section */}
                  {point.notes && (
                    <View style={styles.notesSection}>
                      <Ionicons name="information-circle" size={14} color="#4D96FF" />
                      <Text style={styles.notesText}>{point.notes}</Text>
                    </View>
                  )}

                  {/* Delivery Instructions */}
                  {point.deliveryInstructions && (
                    <View style={styles.instructionsSection}>
                      <Ionicons name="navigate" size={14} color="#FF6B6B" />
                      <Text style={styles.instructionsText}>
                        {point.deliveryInstructions}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCallVendor(point)}
                    >
                      <Ionicons name="call-outline" size={18} color="#759226" />
                      <Text style={styles.actionButtonText}>Contact</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonSecondary]}
                      onPress={() =>
                        Alert.alert(
                          'Email',
                          point.userEmail || 'Email not available'
                        )
                      }
                    >
                      <Ionicons name="mail-outline" size={18} color="#4D96FF" />
                      <Text style={[styles.actionButtonText, { color: '#4D96FF' }]}>
                        Email
                      </Text>
                    </TouchableOpacity>

                    {point.coordinates?.latitude !== 0 &&
                      point.coordinates?.longitude !== 0 && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() =>
                            Alert.alert(
                              'Navigate',
                              `Navigate to ${point.address?.formattedAddress}`
                            )
                          }
                        >
                          <Ionicons name="navigate-outline" size={18} color="#FF6B6B" />
                          <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
                            Navigate
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>

                  {/* Footer Info */}
                  <View style={styles.footerInfo}>
                    <Text style={styles.footerText}>
                      Added {point.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default CollectionPoints;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  headerSubText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 4,
    maxWidth: '80%',
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
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#759226',
    borderColor: '#759226',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  pointsContainer: {
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
    paddingHorizontal: 32,
  },
  pointCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
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
    fontSize: 9,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  pointHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pointIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#6BCB77',
  },
  addressSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 18,
  },
  districtText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1565C0',
  },
  instructionsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#C62828',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#759226',
  },
  footerInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
});