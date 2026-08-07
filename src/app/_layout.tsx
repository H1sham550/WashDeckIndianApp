import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Dismiss native splash screen as early as possible
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen immediately when layout mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
