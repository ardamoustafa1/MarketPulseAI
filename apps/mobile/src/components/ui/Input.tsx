import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, Pressable } from 'react-native';
import { Box } from './Box';
import { colors, radius, spacing } from '../../theme';
import { Search, X } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  onClear?: () => void;
  withSearch?: boolean;
}

export const Input: React.FC<InputProps> = ({ style, onClear, withSearch, value, ...rest }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box 
      row align="center" 
      style={[
        styles.container, 
        isFocused && styles.containerFocused,
        style
      ]}
    >
      {withSearch && <Search color={isFocused ? colors.text.primary : colors.text.muted} size={18} style={styles.iconL} />}
      
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.text.muted}
        onFocus={(e) => {
          setIsFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          rest.onBlur?.(e);
        }}
        value={value}
        {...rest}
      />
      
      {value && value.length > 0 && onClear && (
        <Pressable onPress={onClear} hitSlop={15} style={styles.iconR}>
          <Box style={styles.clearBadge}>
             <X color={colors.text.primary} size={12} />
          </Box>
        </Pressable>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  containerFocused: {
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'System',
    height: '100%',
  },
  iconL: {
    marginRight: spacing.sm,
  },
  iconR: {
    marginLeft: spacing.sm,
  },
  clearBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    padding: 2,
  }
});
