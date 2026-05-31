import { Pressable, Text } from 'react-native';

import { useThemeColors } from '../lib/theme-context';

export interface DayChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function DayChip({ label, active, onPress }: DayChipProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className="items-center justify-center rounded-full"
      style={{
        width: 40,
        height: 40,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.divider,
      }}>
      <Text
        className="text-body-large font-primary-semibold"
        style={{ color: active ? colors.onPrimary : colors.primaryText }}>
        {label}
      </Text>
    </Pressable>
  );
}
