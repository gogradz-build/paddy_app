import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FarmerLayout() {
  return (
    <SafeAreaProvider>
      <TabsWithSafeArea />
    </SafeAreaProvider>
  );
}

function TabsWithSafeArea() {
  const insets = useSafeAreaInsets();
  
  // Calculate proper tab bar height with safe bottom padding
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 65;
  const tabBarPaddingBottom = Platform.OS === 'ios' 
    ? Math.max(insets.bottom, 20) 
    : 10;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#759226',
        tabBarInactiveTintColor: '#8B9DC3',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
          marginTop: 1,
        },
        headerShown: false,
      }}
    >
      
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIconContainer]}>
              <Ionicons 
                name={focused ? 'home' : 'home-outline'} 
                size={24} 
                color={focused ? '#FFFFFF' : color} 
              />
            </View>
          ),
        }}
      />

      
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIconContainer]}>
              <MaterialIcons 
                name="store"
                size={24} 
                color={focused ? '#FFFFFF' : color} 
              />
            </View>
          ),
        }}
      />

     
      <Tabs.Screen
        name="price"
        options={{
          title: 'Prices',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIconContainer]}>
              <FontAwesome5 
                name="dollar-sign"
                size={20} 
                color={focused ? '#FFFFFF' : color} 
              />
            </View>
          ),
        }}
      />

      
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIconContainer]}>
              <MaterialIcons 
                name="history"
                size={24} 
                color={focused ? '#FFFFFF' : color} 
              />
            </View>
          ),
        }}
      />

      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIconContainer]}>
              <Ionicons 
                name={focused ? 'person' : 'person-outline'} 
                size={24} 
                color={focused ? '#FFFFFF' : color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 1,
  },
  activeTabIconContainer: {
    backgroundColor: '#759226',
  },
});