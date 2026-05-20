import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '../lib/theme-context';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing and using RiseTogether, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.',
  },
  {
    title: '2. User Conduct',
    body: "Users are responsible for maintaining the confidentiality of their account and password. You agree to use the service only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the service.",
  },
  {
    title: '3. Intellectual Property',
    body: 'All content, features, and functionality including but not limited to text, graphics, logos, and software are the exclusive property of RiseTogether and are protected by international copyright, trademark, and other intellectual property laws.',
  },
  {
    title: '4. Limitation of Liability',
    body: 'In no event shall RiseTogether be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or other intangible losses resulting from your access to or use of the service.',
  },
  {
    title: '5. Governing Law',
    body: 'These terms shall be governed and construed in accordance with the laws of your jurisdiction, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these terms will not be considered a waiver of those rights.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View className="flex-row items-center border-b border-divider px-4 pb-3 pt-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/sign-up'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
        </Pressable>
        <Text className="ml-1 text-title-large font-primary-bold text-primary-text">
          Terms of Service
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>
        <View className="self-start rounded-full border border-divider bg-surface px-3.5 py-1.5">
          <Text className="text-body-small font-secondary text-secondary-text">
            Last Updated: May 20, 2026
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} className="mt-7">
            <Text className="text-title-medium font-primary-bold text-primary-text">
              {section.title}
            </Text>
            <Text className="mt-2 text-body-medium font-secondary text-secondary-text">
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
