import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SuccessToastProps = {
  visible: boolean;
  message?: string;
  onFinish?: () => void;
};

/**
 * Animated success checkmark overlay that appears briefly after a key action
 * (e.g. completing a sale) before navigating to the next screen.
 */
export function SuccessToast({ visible, message = 'Sale saved!', onFinish }: SuccessToastProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      scale.value = withSpring(1, { damping: 16, stiffness: 220 });
      opacity.value = withSequence(
        withTiming(1, { duration: 140 }),
        withDelay(
          850,
          withTiming(0, { duration: 220 }, (finished) => {
            if (finished && onFinish) {
              runOnJS(onFinish)();
            }
          })
        )
      );
    } else {
      opacity.value = 0;
      translateY.value = 18;
      scale.value = 0.96;
    }
  }, [visible, onFinish, opacity, scale, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.backdrop, { paddingBottom: Math.max(insets.bottom, 12) + 84 }]}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: colorScheme === 'dark' ? '#000000' : '#1E1E1E',
          },
          containerStyle,
        ]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
          <IconSymbol name="checkmark.circle.fill" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.copy}>
          <ThemedText style={[styles.message, { color: theme.text }]}>{message}</ThemedText>
          <ThemedText style={[styles.detail, { color: theme.muted }]}>Opening receipt...</ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
  },
});
