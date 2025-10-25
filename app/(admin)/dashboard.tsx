import { AntDesign, EvilIcons, Feather, FontAwesome5, Foundation, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, getFirestore, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserData = {
  uid: string;
  name: string;
  email: string;
  district: string;
  city: string;
  userType: string;
  isActive: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
};
type Transaction = {
  id: string;
  farmerUid: string;
  vendorUid: string;
  paddyId: string;
  paddyName: string;
  measuredQty: number;
  price: number;
  createdAt?: any;
  status?: string;
};
const dashboard = () => {
 
  const test = require("../../assets/images/sampleUser.png");
  const cloude = require("../../assets/images/cloude.png")
  const [userName,setUserName] = useState('');
  const [city,setCity] = useState('');
  const paddy = require('../../assets/images/paddy.png');

  const [regUsers,setRegUsers] = useState<number>();
  const [paddycount,setPaddyCount] = useState<number>();
  const db = getFirestore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const getUserCount = async () => {
    const coll = collection(db, "users");
    const snapshot = await getCountFromServer(coll);
    console.log("Total registered users:", snapshot.data().count);
    setRegUsers(snapshot.data().count)
    return snapshot.data().count;
  };
  const getpaddyCount = async () => {
    const coll = collection(db, "paddy");
    const snapshot = await getCountFromServer(coll);
    console.log("Total paddy Count is:", snapshot.data().count);
    setPaddyCount(snapshot.data().count)
    return snapshot.data().count;
  };

   useEffect(() => {
    loadUserName();
    getUserCount();
    getpaddyCount();
    fetchAdminTransactions();
  }, []);

  const loadUserName = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      
      if (userDataString) {
        const userData: UserData = JSON.parse(userDataString);
        setUserName(userData.name);
        setCity(userData.city)
      }
    } catch (error) {
      console.error("Error loading username:", error);
      setUserName(''); 
    } 
  };
    const fetchAdminTransactions = () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: Transaction[] = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
        );
        setTransactions(items);
       
      },
      (error) => {
        console.error('Error fetching admin transactions:', error);
        
      }
    );

    return unsubscribe;
  };
  const setLogout = async () => {
    try {
      await AsyncStorage.removeItem("userData");
      setUserName("");
      
      router.push("/");
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={test} style={styles.coverImg} />
          <View style={styles.headerContainer}>
            <Text style={styles.hederTitle}>Welcome , {userName}!</Text>
            <Text style={styles.hederText}>
               Here’s your paddy farm status at a glance
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.imgcontainer}>
            <View style={styles.imgRow}>
              <Image source={cloude} />
              <Text style={{ color: "white" }}>28c</Text>
            </View>
            <View style={styles.imgRow}>
              <Ionicons name={"location"} size={24} color={"#759226"} />
              <Text style={styles.cityText}>{city}, Sri Lanka</Text>
            </View>
          </View>

          <View style={styles.rightRow}>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <Ionicons name={"leaf-sharp"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Harvest</Text>
              </View>
              <Text style={styles.bodyLargeTitle}>2450 kg</Text>
            </View>
            <View style={styles.headerContainer}>
              <View style={styles.imgRow}>
                <FontAwesome5 name={"coins"} size={24} color={"#759226"} />
                <Text style={styles.smallTitle}>Total Harvest</Text>
              </View>
              <Text style={styles.bodyLargeTitle}>LKR 90,000</Text>
            </View>
          </View>
        </View>
        <Text style={styles.bodyTitle}>Dashboard</Text>
        <View style={styles.maincard}>
          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <Feather name="user" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Total Users</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{regUsers}</Text>
            </View>
          </View>

          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <MaterialIcons name="currency-exchange" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Active Transactions</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{transactions.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.maincard}>
          <View style={styles.secondCard}>
            <View style={{display:'flex', flexDirection:'column',alignItems:'center',width:'50%',height:'100%',justifyContent:'center',gap:8}}>
              <EvilIcons name="location" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>GPS location</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>3</Text>
            </View>
          </View>

          <View style={styles.secondCard}>
            <View style={styles.leftCard}>
              <FontAwesome5 name="seedling" color={"#E2E2E2"} size={32} />
              <Text style={styles.bodysecondTitle}>Total Variants</Text>
            </View>
            <View style={styles.qtycard}>
              <Text style={styles.bodyTitle}>{paddycount}</Text>
            </View>
          </View>
        </View>
      <Text style={styles.bodyTitle}>Quick Access Menu</Text>
      <View style={styles.quckAccess}>
          <View style={styles.smallcard}>
            <Feather name='users' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={()=>router.push('/ui/Users')}>
              <Text style={styles.bttntext}>User</Text>
            </TouchableOpacity>
          </View>
        
          <View style={styles.smallcard}>
            <Ionicons name='pricetags-outline' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={()=>router.push('/(admin)/price')}>
              <Text style={styles.bttntext}>Price Control</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.smallcard}>
            <Foundation name='clipboard-notes' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={()=>router.push('/(admin)/history')}>
              <Text style={styles.bttntext}>Transactions</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.smallcard}>
            <FontAwesome5 name="seedling" color={"#000"} size={32} />
            <TouchableOpacity style={styles.bttn} onPress={()=>router.push('/(admin)/store')}>
              <Text style={styles.bttntext}>Paddy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.smallcard}>
            <AntDesign name='control' color={'#000'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={()=>router.push('/(admin)/profile')}>
              <Text style={styles.bttntext}>Settings</Text>
            </TouchableOpacity>
          </View>
            <View style={styles.smallcard}>
            <AntDesign name='poweroff' color={'#f01414ff'} size={32}/>
            <TouchableOpacity style={styles.bttn} onPress={setLogout}>
              <Text style={styles.bttntext}>Logout</Text>
            </TouchableOpacity>
          </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default dashboard

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 24,
    display: "flex",
    flexDirection: "row",
    paddingBottom: 16,
    gap: 8,
  },
  coverImg: {
    width: 72,
    height: 72,
    borderRadius: 26,
    objectFit: "cover",
  },
  hederTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 24,
  },
  hederText: {
    fontFamily: "Inter-Regular",
    fontSize: 12,
  },
  headerContainer: {
    display: "flex",
    flexDirection: "column",
  },
  body: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    marginBottom: 16,
  },
  bodyLargeTitle: {
    color: "#759226",
    fontFamily: "Inter-Regular",
    textAlign: "right",
    fontSize: 18,
  },

  bodySubtitle: {
    fontSize: 16,
    color: "#E8F5E8",
    marginTop: 5,
    fontFamily: "Inter-Regular",
  },
  imgcontainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    justifyContent: "space-between",
  },
  imgRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  cityText: {
    color: "#ADADAD",
    fontSize: 12,
  },
  rightRow: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  smallTitle: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 14,
  },
  paddyName: {
    color: "#000",
    fontFamily: "Inter-Bold",
    fontSize: 24,
    textTransform: "capitalize",
  },
  MTitle: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 16,
  },
  paddyCode: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 18,
    textTransform: "uppercase",
  },
  paddyWeight: {
    color: "#ADADAD",
    fontFamily: "Inter-Regular",
    fontSize: 24,
    textTransform: "uppercase",
  },
  contentContainer: {
    padding: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paddycard: {
    backgroundColor: "#E2E2E2",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  leftRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  rightRowatPaddy: {
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 1,
    gap: 8,
  },
  maincard: {
    display: "flex",
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
    paddingLeft: 1,
    paddingRight: 2,
    justifyContent: "space-between",
    marginBottom:16,
  },
  secondCard: {
    flex:1,
    height: 104,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Android shadow
    elevation: 5,
    justifyContent: "space-between",
    paddingLeft:4
  },
  bodyTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 18,
    
  },
  bodysecondTitle: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    paddingLeft: 2,
    textAlign:'center'
  },
  leftCard: {
  flex: 1,                        
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},
  qtycard: {
    width: 73,
    height: 61,
    justifyContent: "center",
    alignSelf: "flex-end",
    backgroundColor: "#E2E2E2",
    borderTopLeftRadius: 24.5,
    alignItems: "center",
    borderBottomRightRadius: 12,
  },
  quckAccess:{
    marginTop:16,
    display:'flex',
    flexDirection:'row',
    gap:24,
    flexWrap:'wrap',
    paddingLeft:8,
    justifyContent:'space-between'
  },
  smallcard:{
    width:104,
    alignItems:'center',
    gap:8
  },
  bttn:{
    width:100,
    height:32,
    borderRadius:26,
    backgroundColor:'#000',
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center'
  },
  bttntext:{
    color:'#fff',
    fontSize:12,
    fontFamily:'Inter-Regular'
  }
});
