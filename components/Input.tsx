import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';

import { cn } from './cn';
import { useThemeColors } from '../lib/theme-context';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, leadingIcon, error, secureTextEntry, containerClassName, ...textInputProps },
  ref,
) {
  const colors = useThemeColors();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = !!secureTextEntry;
  const effectiveSecure = isPassword && !isPasswordVisible;

  return (
    <View className={cn('w-full', containerClassName)}>
      {label ? (
        <Text className="mb-2 text-label-large font-secondary-semibold text-primary-text">
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          'flex-row items-center rounded-md border bg-surface px-3.5',
          error ? 'border-error' : 'border-divider',
        )}>
        {leadingIcon ? (
          <Ionicons
            name={leadingIcon}
            size={20}
            color={colors.secondaryText}
            style={{ marginRight: 10 }}
          />
        ) : null}
        <TextInput
          ref={ref}
          className="flex-1 py-3.5 font-secondary text-primary-text"
          style={{ fontSize: 17 }}
          textAlignVertical="center"
          placeholderTextColor={colors.hint}
          secureTextEntry={effectiveSecure}
          {...textInputProps}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setIsPasswordVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}>
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.secondaryText}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1.5 text-body-small font-secondary text-error">{error}</Text>
      ) : null}
    </View>
  );
});
