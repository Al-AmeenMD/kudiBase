import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 100 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(
          600,
          withTiming(0, { duration: 250 }, (finished) => {
            if (finished && onFinish) {
              runOnJS(onFinish)();
            }
          })
        )
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible, onFinish, opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.toast, containerStyle]}>
        <View style={styles.iconCircle}>
          <IconSymbol name="checkmark" size={32} color="#FFFFFF" />
        </View>
        <ThemedText style={styles.message}>{message}</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  toast: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F6A3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 16,
    color: '#111111',
  },
});
