import { StyleSheet } from 'react-native';
import { colors } from './tokens';

// In Expo, actual custom fonts can be loaded later via useFonts hook.
// For now, utilizing system-ui matching the fallback request.
export const fontFamilies = {
  primary: 'System', // Later we hook up Inter or SF Pro Display
};

export const typographyStyles = StyleSheet.create({
  h1: {
    fontFamily: fontFamilies.primary,
    fontSize: 36,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.36, // -1% tracking approx
  },
  h2: {
    fontFamily: fontFamilies.primary,
    fontSize: 24,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: -0.12,
  },
  h3: {
    fontFamily: fontFamilies.primary,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.primary,
  },
  body: {
    fontFamily: fontFamilies.primary,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24, // 150%
    color: colors.text.primary,
  },
  caption: {
    fontFamily: fontFamilies.primary,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
});
