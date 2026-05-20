import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { cn } from './cn';
import { COLORS } from '../constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
}

export function Checkbox({ checked, onChange, children, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-start"
      hitSlop={4}>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-sm border',
          checked ? 'bg-primary border-primary' : 'bg-surface border-divider',
        )}>
        {checked ? <Ionicons name="checkmark" size={16} color={COLORS.onPrimary} /> : null}
      </View>
      {children ? <View className="ml-3 flex-1">{children}</View> : null}
    </Pressable>
  );
}
