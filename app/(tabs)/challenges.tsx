import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '../../lib/theme-context';

export default function Challenges() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-1 px-6 pt-2">
        <Text className="text-headline-medium font-primary-bold text-primary-text">
          Challenges
        </Text>
      </View>
    </SafeAreaView>
  );
}
