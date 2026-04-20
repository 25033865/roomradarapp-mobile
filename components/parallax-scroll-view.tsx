import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedRef,
    useAnimatedStyle,
    useScrollOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { clamp, getDeviceFlags } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const MIN_HEADER_HEIGHT = 220;
const MAX_HEADER_HEIGHT = 340;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const { width, height } = useWindowDimensions();
  const { isTablet, isLargeTablet } = getDeviceFlags(width);
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const baseSize = Math.min(width, height);
  const headerHeight = clamp(baseSize * 0.52, MIN_HEADER_HEIGHT, MAX_HEADER_HEIGHT);
  const horizontalPadding = clamp(width * 0.07, 20, isLargeTablet ? 48 : 36);
  const verticalPadding = clamp(baseSize * 0.06, 18, 34);
  const maxContentWidth = isLargeTablet ? 960 : isTablet ? 820 : 680;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-headerHeight, 0, headerHeight],
            [-headerHeight / 2, 0, headerHeight * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-headerHeight, 0, headerHeight], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}>
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: headerBackgroundColor[colorScheme],
            height: headerHeight,
          },
          headerAnimatedStyle,
        ]}>
        {headerImage}
      </Animated.View>
      <ThemedView
        style={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
            maxWidth: maxContentWidth,
          },
        ]}>
        {children}
      </ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
    overflow: 'hidden',
  },
});
