import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../authprovider';
import { FavoritesProvider } from '../favoritesProvider';
import { useColorScheme } from '../hooks/use-color-scheme';

const APP_BACKGROUND = '#05071A';

SystemUI.setBackgroundColorAsync(APP_BACKGROUND).catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const appTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: APP_BACKGROUND,
      card: APP_BACKGROUND,
    },
  };

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ThemeProvider value={appTheme}>
          <View style={styles.appRoot}>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: APP_BACKGROUND },
                navigationBarColor: APP_BACKGROUND,
                statusBarBackgroundColor: APP_BACKGROUND,
                statusBarStyle: 'light',
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="place-details" options={{ headerShown: false }} />
              <Stack.Screen name="manageprofile" options={{ headerShown: false }} />
              <Stack.Screen name="password-security" options={{ headerShown: false }} />
              <Stack.Screen name="contact-us" options={{ headerShown: false }} />
              <Stack.Screen name="delete-account" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style="light" backgroundColor={APP_BACKGROUND} />
          </View>
        </ThemeProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
});
