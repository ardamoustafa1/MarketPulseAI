import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { typographyStyles, colors } from '../../theme';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  style?: TextStyle | TextStyle[];
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}) => {
  return (
    <RNText
      allowFontScaling
      style={[
        typographyStyles[variant],
        color && { color },
        align && { textAlign: align },
        weight && { fontWeight: weight },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
