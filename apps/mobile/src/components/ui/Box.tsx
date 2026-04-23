import React from 'react';
import { View, ViewProps } from 'react-native';

interface BoxProps extends ViewProps {
  flex?: number;
  row?: boolean;
  center?: boolean;
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  padding?: number;
  margin?: number;
  bg?: string;
  radius?: number;
}

export const Box: React.FC<BoxProps> = ({
  flex,
  row,
  center,
  justify,
  align,
  padding,
  margin,
  bg,
  radius,
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        flex !== undefined && { flex },
        row && { flexDirection: 'row' },
        center && { justifyContent: 'center', alignItems: 'center' },
        justify && !center && { justifyContent: justify },
        align && !center && { alignItems: align },
        padding !== undefined && { padding },
        margin !== undefined && { margin },
        bg !== undefined && { backgroundColor: bg },
        radius !== undefined && { borderRadius: radius },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
