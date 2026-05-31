import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';

import { cn } from './cn';
import { useThemeColors, useThemeFonts } from '../lib/theme-context';

type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  leadingIcon,
  children,
  className,
  ...pressableProps
}: ButtonProps) {
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const spinnerColor = isPrimary ? colors.onPrimary : colors.primary;
  const labelColor = isPrimary ? colors.onPrimary : colors.primaryText;
  // Colors are inline (not via NativeWind classes) so they read from the
  // active palette in useThemeColors — class-based color tokens don't
  // currently cascade through the runtime palette swap.
  const containerStyle = isPrimary
    ? { backgroundColor: colors.primary, opacity: isDisabled ? 0.5 : 1 }
    : {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        opacity: isDisabled ? 0.5 : 1,
      };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn('flex-row items-center justify-center rounded-full px-6 py-4', className)}
      style={containerStyle}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {leadingIcon ? <View className="mr-2">{leadingIcon}</View> : null}
          <Text
            className="text-body-large"
            style={{ color: labelColor, fontFamily: fonts.primarySemibold }}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}
