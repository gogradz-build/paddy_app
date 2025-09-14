import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { Text } from 'react-native';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    
    'Inter-Black': require('../assets/fonts/Inter_18pt-Black.ttf'),
    'Inter-BlackItalic': require('../assets/fonts/Inter_18pt-BlackItalic.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_18pt-Bold.ttf'),
    'Inter-BoldItalic': require('../assets/fonts/Inter_18pt-BoldItalic.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter_18pt-ExtraBold.ttf'),
    'Inter-ExtraBoldItalic': require('../assets/fonts/Inter_18pt-ExtraBoldItalic.ttf'),
    'Inter-ExtraLight': require('../assets/fonts/Inter_18pt-ExtraLight.ttf'),
    'Inter-ExtraLightItalic': require('../assets/fonts/Inter_18pt-ExtraLightItalic.ttf'),
    'Inter-Italic': require('../assets/fonts/Inter_18pt-Italic.ttf'),
    'Inter-Light': require('../assets/fonts/Inter_18pt-Light.ttf'),
    'Inter-LightItalic': require('../assets/fonts/Inter_18pt-LightItalic.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter-Thin': require('../assets/fonts/Inter_18pt-Thin.ttf'),
    'Inter-ThinItalic': require('../assets/fonts/Inter_18pt-ThinItalic.ttf'),
    
    
    'Inter-Bold-24': require('../assets/fonts/Inter_24pt-Bold.ttf'),
    'Inter-BoldItalic-24': require('../assets/fonts/Inter_24pt-BoldItalic.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      
      if (fontsLoaded) {
        (Text as any).defaultProps = {
          ...(Text as any).defaultProps,
          style: { fontFamily: 'Inter-Regular' },
        };
      }
      
      
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  
  if (!fontsLoaded && !fontError) {
    return null;
  }

  
  if (fontError) {
    console.error('Font loading error:', fontError);
    
  }

  return (
    <>
      <StatusBar 
        style="dark" 
        backgroundColor="transparent" 
        translucent={false}
      />
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right', 
        }}
      >
        
      </Stack>
    </>
  );
}