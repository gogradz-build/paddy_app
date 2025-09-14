import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const index = () => {
  const bg = require('../../assets/images/Images_ Ratio.png');
  const router = useRouter();
  
  const handleRegisterClick = () => {
    router.push('/register' as any)
  }
  const handleLogin =()=>{
    router.push('/login/userLogin')
  }
  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.firtSectionText}>Smart</Text>
        <Text style={styles.secondSectionText}>Paddy</Text>
      </View>
      <Image source={bg} style={{ width: 327, marginTop: 24 }} />
      <Text style={styles.bodtText}>
        Empowering Sri Lanka's Farmers with Technology
      </Text>
      <View style={styles.bttnContainer}>
        <TouchableOpacity style={styles.farmerBttn} onPress={()=>handleLogin()}>
          <Text style={styles.bttnText}>Login as Farmer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.venderBttn} onPress={()=>handleLogin()}>
          <Text style={styles.bttnText}>Login as Vendor</Text>
        </TouchableOpacity>
        <View style={styles.loginLinkContainer}>
          <Text style={styles.registeText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => handleRegisterClick()}>
            <Text style={styles.registerLinkText}> Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default index

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 48,
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    justifyContent:'space-between'
  },
  header: {
    display: "flex",
    flexDirection: "row",
    gap: 4,
  },
  firtSectionText: {
    color: "#759226",
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
  },
  secondSectionText: {
    color: "#000",
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
  },
  bodtText: {
    fontFamily: "Inter-Bold",
    fontSize: 22,
    lineHeight: 32,
    textAlign: "center",
    fontWeight: "bold",
  },
  bttnContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 72,
    paddingBottom:24
  },
  farmerBttn: {
    backgroundColor: "#000",
    borderRadius: 48,
    height: 48,
    width: 327,
    alignItems: "center",
    justifyContent: "center",
  },
  venderBttn: {
    backgroundColor: "#759226",
    borderRadius: 48,
    height: 48,
    width: 327,
    alignItems: "center",
    justifyContent: "center",
  },
  bttnText: {
    color: "white",
    fontFamily: "Inter-Regular",
    fontWeight: "bold",
    fontSize: 16,
  },
  registeText: {
    color: "black",
    fontFamily: "Inter-Regular",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerLinkText: {
    color: "#759226",
    fontFamily: "Inter-Regular",
    fontWeight: "bold",
    fontSize: 16,
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
});