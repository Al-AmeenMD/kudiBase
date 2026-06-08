import { useEffect } from 'react';
import { type DimensionValue, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="80%" height={22} />
      <Skeleton width="40%" height={12} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skeletonStyles.row, style]}>
      <View style={skeletonStyles.rowContent}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={36} height={28} borderRadius={14} />
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Quick actions */}
      <Skeleton width="40%" height={20} style={skeletonStyles.sectionTitle} />
      <View style={skeletonStyles.quickGrid}>
        <Skeleton width="48%" height={96} borderRadius={16} />
        <Skeleton width="48%" height={96} borderRadius={16} />
        <Skeleton width="48%" height={96} borderRadius={16} />
        <Skeleton width="48%" height={96} borderRadius={16} />
      </View>

      {/* Stats */}
      <Skeleton width="50%" height={20} style={skeletonStyles.sectionTitle} />
      <View style={skeletonStyles.statsRow}>
        <SkeletonCard style={{ flex: 1 }} />
        <SkeletonCard style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={skeletonStyles.listCard}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} style={i > 0 ? skeletonStyles.rowDivider : undefined} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    gap: 24,
  },
  sectionTitle: {
    marginBottom: -12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  listCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
