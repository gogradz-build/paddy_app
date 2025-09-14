import { useRouter } from "expo-router";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";


export default function Index() {
  const bg=require('../assets/images/mainimage.jpg');
  const router = useRouter();

   const handleClick = () => {
    console.log('clicked')
    router.push('/login' as any);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ImageBackground source={bg} style={styles.background} resizeMode="cover">
          <View style={styles.content}>
            <Text style={styles.text}>Smart Paddy</Text>
            <Text style={styles.secondText}>
              Your Smart Paddy Measurement & Pricing Companion!
            </Text>
          </View>
          <View style={styles.bttncontainer}>
            <TouchableOpacity style={styles.bttn} onPress={() => handleClick()}>
              <Text style={styles.bttnText}>
                Get Started
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop:48
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily:'Inter-Light'
  },
  secondText:{
    color:'black',
    fontSize:32,
    fontWeight:'bold',
    fontFamily:'Inter-Bold',
    paddingTop:16,
    textAlign:'center'
  },
  bttncontainer:{
    display:'flex',
    alignItems:'center'
  },
  bttn:{
    backgroundColor:'#8BAD2E',
    
    borderRadius:48,
    height:48,
    width:327,
    alignItems:'center',
    justifyContent:'center',
    marginBottom:32
  },
  bttnText:{
    color:'white',
    fontFamily:'Inter-Regular',
    fontWeight:'bold',
    fontSize:16
  }
});
