/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const brandGreen = '#0F6A3D';
const brandGreenDeep = '#0B4F2F';
const brandSand = '#F4E6C1';
const brandAmber = '#F28C28';
const brandInk = '#1E1E1E';
const brandMuted = '#6B7280';
const brandSurface = '#FFFFFF';
const brandBackground = '#F9F6EF';
const brandBorder = '#E6E0D3';

export const Colors = {
  light: {
    text: brandInk,
    background: brandBackground,
    tint: brandGreen,
    icon: brandMuted,
    tabIconDefault: brandMuted,
    tabIconSelected: brandGreen,
    surface: brandSurface,
    primary: brandGreen,
    primaryDeep: brandGreenDeep,
    secondary: brandSand,
    onSecondary: brandInk,
    accent: brandAmber,
    muted: brandMuted,
    border: brandBorder,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    surface: '#1E2024',
    primary: brandGreen,
    primaryDeep: brandGreenDeep,
    secondary: brandSand,
    onSecondary: brandInk,
    accent: brandAmber,
    muted: '#A1A1AA',
    border: '#2B2F36',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Sora-Regular',
    serif: 'Sora-Regular',
    rounded: 'Sora-Regular',
    mono: 'Sora-Regular',
  },
  default: {
    sans: 'Sora-Regular',
    serif: 'Sora-Regular',
    rounded: 'Sora-Regular',
    mono: 'Sora-Regular',
  },
  web: {
    sans: "'Sora', system-ui, sans-serif",
    serif: "'Sora', system-ui, sans-serif",
    rounded: "'Sora', system-ui, sans-serif",
    mono: "'Sora', system-ui, sans-serif",
  },
});
