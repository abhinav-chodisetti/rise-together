import { useClerk, useUser } from '@clerk/expo';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { COLORS } from '../../constants/theme';

export default function Home() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-headline-medium font-primary-bold text-primary-text">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}.
        </Text>
        <Text className="mt-2 text-body-large font-secondary text-secondary-text">
          You&apos;re signed in. The real home screen lands here next.
        </Text>

        <View className="mt-8">
          <Button variant="secondary" onPress={() => signOut()} accessibilityLabel="Sign out">
            Sign out
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
