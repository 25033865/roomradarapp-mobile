import { Stack } from 'expo-router';

const APP_BACKGROUND = '#05071A';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: APP_BACKGROUND },
        navigationBarColor: APP_BACKGROUND,
        statusBarBackgroundColor: APP_BACKGROUND,
        statusBarStyle: 'light',
      }}
    />
  );
}
