import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';

import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<
  ButtonVariant,
  { container: string; label: string; spinner: 'white' | undefined }
> = {
  primary: {
    container: 'bg-primary',
    label: 'text-on-primary',
    spinner: 'white',
  },
  secondary: {
    container: 'bg-surface border border-divider',
    label: 'text-primary-text',
    spinner: undefined,
  },
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  leadingIcon,
  children,
  className,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-full px-6 py-4',
        v.container,
        isDisabled && 'opacity-50',
        className,
      )}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <>
          {leadingIcon ? <View className="mr-2">{leadingIcon}</View> : null}
          <Text className={cn('text-body-large font-primary-semibold', v.label)}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}
