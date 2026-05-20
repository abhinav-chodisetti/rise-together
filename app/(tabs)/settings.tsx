import { useClerk, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { cn } from '../../components/cn';
import { useNotifications } from '../../lib/notifications-context';
import { useTheme, useThemeColors } from '../../lib/theme-context';

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const colors = useThemeColors();
  const { isDark, setIsDark } = useTheme();
  const { enabled: notificationsEnabled, setEnabled: setNotificationsEnabled } = useNotifications();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'there';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center pt-2 pb-6">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
          </Pressable>
          <Text className="ml-1 text-headline-medium font-primary-bold text-primary-text">
            Settings
          </Text>
        </View>

        <View className="flex-row items-center pb-6">
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text className="text-headline-medium font-primary-bold text-on-primary">
                {initials}
              </Text>
            </View>
          )}

          <View className="ml-4 flex-1">
            <Text className="text-title-large font-primary-bold text-primary-text">
              {displayName}
            </Text>
            {email ? (
              <Text className="mt-0.5 text-body-medium font-secondary text-secondary-text">
                {email}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              /* TODO(profile-edit): open profile editor */
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit profile">
            <Ionicons name="pencil" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>

        <View className="rounded-md bg-surface p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-body-small font-secondary text-secondary-text">
                Subscription
              </Text>
              <View className="mt-1 flex-row items-center">
                <Text className="text-title-medium font-primary-bold text-primary-text">
                  Pro Plan
                </Text>
                <View className="ml-2 rounded-full bg-primary/10 px-2 py-0.5">
                  <Text className="text-body-small font-secondary-semibold text-primary">PRO</Text>
                </View>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() => {
                /* TODO(subscription): open subscription management */
              }}
              className="px-5 py-2">
              Manage
            </Button>
          </View>
        </View>

        <SectionHeader>Preferences</SectionHeader>

        <View className="overflow-hidden rounded-md bg-surface">
          <ToggleRow
            iconName="notifications"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackOnColor={colors.primary}
            trackOffColor={colors.divider}
          />
          <View className="h-px bg-divider" />
          <ToggleRow
            iconName="moon"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Dark Mode"
            value={isDark}
            onValueChange={setIsDark}
            trackOnColor={colors.primary}
            trackOffColor={colors.divider}
          />
        </View>

        <SectionHeader>Support</SectionHeader>

        <View className="overflow-hidden rounded-md bg-surface">
          <NavRow
            iconName="document-text-outline"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Terms of Service"
            labelClassName="text-primary-text"
            onPress={() => router.push('/terms')}
            chevronColor={colors.hint}
          />
          <View className="h-px bg-divider" />
          <NavRow
            iconName="log-out-outline"
            iconColor={colors.error}
            tileBg="bg-error/10"
            label="Logout"
            labelClassName="text-error"
            onPress={() => signOut()}
            hideChevron
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="mt-8 mb-3 text-body-small font-secondary-semibold text-secondary-text"
      style={{ letterSpacing: 1.2 }}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function IconTile({
  iconName,
  iconColor,
  tileBg,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
}) {
  return (
    <View className={cn('h-10 w-10 items-center justify-center rounded-md', tileBg)}>
      <Ionicons name={iconName} size={20} color={iconColor} />
    </View>
  );
}

function ToggleRow({
  iconName,
  iconColor,
  tileBg,
  label,
  value,
  onValueChange,
  trackOnColor,
  trackOffColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackOnColor: string;
  trackOffColor: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className="flex-row items-center px-4 py-3.5"
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}>
      <IconTile iconName={iconName} iconColor={iconColor} tileBg={tileBg} />
      <Text className="ml-3 flex-1 text-body-large font-secondary text-primary-text">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: trackOnColor, false: trackOffColor }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={trackOffColor}
      />
    </Pressable>
  );
}

function NavRow({
  iconName,
  iconColor,
  tileBg,
  label,
  labelClassName,
  onPress,
  hideChevron,
  chevronColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
  label: string;
  labelClassName?: string;
  onPress: () => void;
  hideChevron?: boolean;
  chevronColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5"
      accessibilityRole="button"
      accessibilityLabel={label}>
      <IconTile iconName={iconName} iconColor={iconColor} tileBg={tileBg} />
      <Text
        className={cn(
          'ml-3 flex-1 text-body-large font-secondary',
          labelClassName ?? 'text-primary-text',
        )}>
        {label}
      </Text>
      {!hideChevron && chevronColor ? (
        <Ionicons name="chevron-forward" size={20} color={chevronColor} />
      ) : null}
    </Pressable>
  );
}
