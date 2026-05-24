import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { useChallenges } from '../../lib/challenges-context';
import { type Challenge, type ChallengeStatus } from '../../lib/mock-challenges';
import { useThemeColors } from '../../lib/theme-context';

export default function Challenges() {
  const colors = useThemeColors();
  const router = useRouter();
  const { challenges } = useChallenges();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredChallenges = useMemo(
    () =>
      trimmedQuery
        ? challenges.filter((c) => c.name.toLowerCase().includes(trimmedQuery))
        : challenges,
    [challenges, trimmedQuery],
  );

  const activeCount = challenges.filter((c) => c.status === 'active').length;
  const wonCount = 12; // TODO(challenges-backend): derive from challenge completion history.

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {isSearchOpen ? (
          <View className="flex-row items-center pt-2 pb-6">
            <View
              className="flex-1 flex-row items-center rounded-full bg-surface px-4"
              style={{ height: 44 }}>
              <Ionicons name="search" size={18} color={colors.secondaryText} />
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search challenges"
                placeholderTextColor={colors.hint}
                returnKeyType="search"
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 16,
                  color: colors.primaryText,
                  fontFamily: 'Inter-Regular',
                }}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.hint} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={closeSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel search"
              className="ml-3">
              <Text className="text-label-large font-secondary-semibold text-primary">Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-start justify-between pt-2 pb-6">
            <View className="flex-1 pr-3">
              <Text className="text-headline-large font-primary-bold text-primary">
                RiseTogether
              </Text>
              <Text className="text-headline-large font-primary-bold text-primary-text">
                Challenges
              </Text>
            </View>
            <Pressable
              onPress={() => setIsSearchOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Search challenges"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="search" size={20} color={colors.primaryText} />
            </Pressable>
          </View>
        )}

        {isSearchOpen ? null : (
          <View className="flex-row gap-3">
            <StatCard label="Active" value={activeCount} />
            <StatCard label="Won" value={wonCount} />
          </View>
        )}

        <View
          className="flex-row items-center justify-between"
          style={{ marginTop: isSearchOpen ? 0 : 32 }}>
          <Text className="text-title-large font-primary-bold text-primary-text">
            {isSearchOpen
              ? trimmedQuery
                ? `${filteredChallenges.length} result${filteredChallenges.length === 1 ? '' : 's'}`
                : 'All Groups'
              : 'Your Groups'}
          </Text>
          {!isSearchOpen ? (
            <Pressable
              onPress={() => {
                /* TODO(challenges): navigate to full list */
              }}
              hitSlop={6}
              accessibilityRole="link"
              accessibilityLabel="See all challenges">
              <Text className="text-label-large font-secondary-semibold text-primary">See All</Text>
            </Pressable>
          ) : null}
        </View>

        {filteredChallenges.length === 0 ? (
          <View className="mt-10 items-center">
            <Ionicons name="search" size={28} color={colors.hint} />
            <Text className="mt-3 text-body-medium font-secondary text-secondary-text">
              No challenges match &ldquo;{searchQuery.trim()}&rdquo;
            </Text>
          </View>
        ) : (
          <View className="mt-4 gap-5">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}>
        <Button
          onPress={() => router.push('/challenges/create')}
          leadingIcon={<Ionicons name="add" size={20} color={colors.onPrimary} />}
          accessibilityLabel="Create challenge">
          Create Challenge
        </Button>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-md bg-surface px-5 py-4">
      <Text className="text-body-small font-secondary text-secondary-text">{label}</Text>
      <Text className="mt-1 text-headline-medium font-primary-bold text-primary-text">{value}</Text>
    </View>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const colors = useThemeColors();
  const router = useRouter();
  const othersCount = Math.max(0, challenge.participantCount - challenge.avatarColors.length);

  return (
    <Pressable
      onPress={() => router.push(`/challenges/${challenge.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${challenge.name}`}
      className="overflow-hidden rounded-md bg-surface">
      {challenge.coverImageUri ? (
        <Image
          source={{ uri: challenge.coverImageUri }}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
      ) : null}
      <View className="p-5">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-title-large font-primary-bold text-primary-text">
            {challenge.name}
          </Text>
          <StatusPill status={challenge.status} />
        </View>

        <Text className="mt-1 text-body-small font-secondary text-secondary-text">
          {challenge.status === 'joined' && challenge.startsInDays !== undefined
            ? `Starts in ${challenge.startsInDays} days`
            : `${challenge.daysRemaining} days remaining • ${challenge.participantCount} participants`}
        </Text>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-body-medium font-primary-bold text-primary-text">Group Progress</Text>
          <Text className="text-body-medium font-primary-bold text-primary">
            {challenge.progressPercent}%
          </Text>
        </View>
        <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-divider">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${challenge.progressPercent}%` }}
          />
        </View>

        <View className="mt-4 flex-row items-center">
          <View className="flex-row">
            {challenge.avatarColors.map((color, idx) => (
              <View
                key={idx}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  marginLeft: idx === 0 ? 0 : -8,
                }}
              />
            ))}
          </View>
          {othersCount > 0 ? (
            <Text className="ml-2 text-body-small font-secondary text-secondary-text">
              +{othersCount} others
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: ChallengeStatus }) {
  if (status === 'active') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-body-small font-secondary-semibold text-success">Active</Text>
      </View>
    );
  }
  return (
    <View className="rounded-full bg-background px-3 py-1">
      <Text className="text-body-small font-secondary-semibold text-primary-text">Joined</Text>
    </View>
  );
}
