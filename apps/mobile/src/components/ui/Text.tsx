import React from 'react';
import { Platform, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { typographyStyles, colors } from '../../theme';
import { uiTokens } from '@marketpulse/ui';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  /**
   * When true, renders with tabular figures so numeric columns align perfectly.
   * Use on any price, quantity, or percentage that sits in a list/grid context.
   */
  mono?: boolean;
  style?: TextStyle | TextStyle[];
}

const MONO_STYLE: TextStyle = Platform.select({
  ios: { fontVariant: ['tabular-nums'] },
  android: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align,
  weight,
  mono,
  style,
  children,
  ...rest
}) => {
  return (
    <RNText
      allowFontScaling
      style={[
        typographyStyles[variant],
        { color: color ?? colors.text.primary },
        !color && variant === 'caption' ? { color: uiTokens.accentBlue } : null,
        align && { textAlign: align },
        weight && { fontWeight: weight },
        mono && MONO_STYLE,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
