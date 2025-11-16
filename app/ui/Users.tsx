import { firestore } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  district: string;
  city: string;
  userType: 'farmer' | 'admin';
  isActive: boolean;
  createdAt: any;
  emailVerified?: boolean;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'farmer' | 'admin'>('all');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(firestore, 'users');
      const q = query(usersCollection, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          usersData.push({
            id: doc.id,
            ...doc.data()
          } as User);
        });
        setUsers(usersData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const confirmDeleteUser = (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?\n\nThis action cannot be undone and will permanently remove all user data.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteUser(user.id),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setProcessingUserId(userId);
      await deleteDoc(doc(firestore, 'users', userId));
      
      Alert.alert('Success', 'User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user. Please try again.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const confirmPromoteUser = (user: User) => {
    const isPromoting = user.userType !== 'admin';
    const action = isPromoting ? 'promote to Admin' : 'demote to Farmer';
    const newRole = isPromoting ? 'Admin' : 'Farmer';
    
    Alert.alert(
      `${isPromoting ? 'Promote' : 'Demote'} User`,
      `Are you sure you want to ${action}?\n\n${user.name} will become ${newRole} with ${isPromoting ? 'full administrative privileges' : 'standard user privileges'}.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: isPromoting ? 'Promote' : 'Demote',
          style: 'default',
          onPress: () => handlePromoteUser(user.id, isPromoting ? 'admin' : 'farmer'),
        },
      ],
      { cancelable: true }
    );
  };

  const handlePromoteUser = async (userId: string, newUserType: 'admin' | 'farmer') => {
    try {
      setProcessingUserId(userId);
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        userType: newUserType,
        updatedAt: new Date(),
      });
      
      const action = newUserType === 'admin' ? 'promoted to Admin' : 'demoted to Farmer';
      Alert.alert('Success', `User ${action} successfully!`);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role. Please try again.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.district.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || user.userType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return '#FF6B6B';
      case 'farmer': return '#4ECDC4';
      default: return '#95A5A6';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin': return 'shield-checkmark';
      case 'farmer': return 'leaf';
      default: return 'person';
    }
  };

  const renderUserCard = ({ item: user }: { item: User }) => (
    <View style={styles.userCard}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <View style={styles.userMainInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(user.userType) }]}>
              <Ionicons 
                name={getUserTypeIcon(user.userType) as any} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.userTypeText}>{user.userType}</Text>
            </View>
          </View>
          
          <View style={styles.userDetails}>
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.locationText}>{user.city}, {user.district}</Text>
            </View>
            {user.emailVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.promoteButton,
              { opacity: processingUserId === user.id ? 0.6 : 1 }
            ]}
            onPress={() => confirmPromoteUser(user)}
            disabled={processingUserId === user.id}
          >
            {processingUserId === user.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons 
                  name={user.userType === 'admin' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.actionButtonText}>
                  {user.userType === 'admin' ? 'Demote' : 'Promote'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              { opacity: processingUserId === user.id ? 0.6 : 1 }
            ]}
            onPress={() => confirmDeleteUser(user)}
            disabled={processingUserId === user.id}
          >
            {processingUserId === user.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFilterChip = (type: 'all' | 'farmer' | 'admin', label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterType === type && styles.activeFilterChip
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterChipText,
        filterType === type && styles.activeFilterChipText
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#ebecf1ff', '#0a0a0aff']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        {renderFilterChip('all', 'All', users.length)}
        {renderFilterChip('farmer', 'Farmers', users.filter(u => u.userType === 'farmer').length)}
        {renderFilterChip('admin', 'Admins', users.filter(u => u.userType === 'admin').length)}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No users available'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8eaf6',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter-Regular',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterChip: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 16,
  },
  userInfo: {
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userMainInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'Inter-Regular',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  userTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  promoteButton: {
    backgroundColor: '#4ECDC4',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#95a5a6',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default Users;