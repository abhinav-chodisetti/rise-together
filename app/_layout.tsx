import '../global.css';

import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChallengesProvider } from '../lib/challenges-context';
import { HabitsProvider } from '../lib/habits-context';
import { NotificationsProvider } from '../lib/notifications-context';
import { ThemeProvider, useTheme, usePaletteVars } from '../lib/theme-context';
import { useProfileSync } from '../lib/use-profile-sync';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ThemeProvider>
          <NotificationsProvider>
            <HabitsProvider>
              <ChallengesProvider>
                <ThemedRoot />
              </ChallengesProvider>
            </HabitsProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function ThemedRoot() {
  const { isDark } = useTheme();
  const paletteVars = usePaletteVars();
  useProfileSync();
  return (
    // The vars-applying View propagates the active palette's CSS variables
    // to every NativeWind class below it. Empty object on the default palette
    // means global.css drives, untouched.
    <View style={[{ flex: 1 }, paletteVars]}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </View>
  );
}
