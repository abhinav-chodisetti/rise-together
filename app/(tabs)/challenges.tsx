import { Ionicons } from '@expo/vector-icons';
import { useNavigationGuard } from '../../lib/use-navigation-guard';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { cn } from '../../components/cn';
import {
  useChallenges,
  type Challenge,
  type ChallengeStatus,
} from '../../lib/challenges-context';
import { todayISO } from '../../lib/streak';
import { useThemeColors, useThemeFonts } from '../../lib/theme-context';

export default function Challenges() {
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const router = useNavigationGuard();
  const { challenges, isHydrated, loadError } = useChallenges();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  // Split challenges into live (active or upcoming) vs completed (ended).
  const { liveChallenges, completedChallenges } = useMemo(() => {
    const today = todayISO();
    const live: Challenge[] = [];
    const done: Challenge[] = [];
    for (const c of challenges) {
      if (c.endDate && c.endDate < today) done.push(c);
      else live.push(c);
    }
    return { liveChallenges: live, completedChallenges: done };
  }, [challenges]);

  const filterByQuery = (list: Challenge[]) =>
    trimmedQuery
      ? list.filter((c) => c.name.toLowerCase().includes(trimmedQuery))
      : list;
  const filteredLive = useMemo(
    () => filterByQuery(liveChallenges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveChallenges, trimmedQuery],
  );
  const filteredCompleted = useMemo(
    () => filterByQuery(completedChallenges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedChallenges, trimmedQuery],
  );
  const filteredChallenges = filteredLive;

  const activeChallengeCount = liveChallenges.filter((c) => c.status === 'active').length;
  const activeCount: number | string = activeChallengeCount === 0 ? '—' : activeChallengeCount;
  const wonCount: number | string =
    completedChallenges.length === 0 ? '—' : completedChallenges.length;

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
              <Text
                className="text-label-large font-secondary-semibold"
                style={{ color: colors.primary }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-start justify-between pt-2 pb-6">
            <View className="flex-1 pr-3">
              <Text
                className="text-headline-large text-primary-text"
                style={{ fontFamily: fonts.primaryBold }}>
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

        {isSearchOpen && trimmedQuery ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-title-large font-primary-bold text-primary-text">
              {`${filteredChallenges.length} result${filteredChallenges.length === 1 ? '' : 's'}`}
            </Text>
          </View>
        ) : null}

        {!isHydrated ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : loadError ? (
          <View className="mt-10 items-center px-6">
            <Ionicons name="cloud-offline-outline" size={28} color={colors.hint} />
            <Text className="mt-3 text-center text-body-medium font-secondary text-secondary-text">
              Couldn&apos;t load challenges. Pull down to retry.
            </Text>
          </View>
        ) : filteredChallenges.length === 0 ? (
          trimmedQuery.length > 0 ? (
            <View className="mt-10 items-center">
              <Ionicons name="search" size={28} color={colors.hint} />
              <Text className="mt-3 text-body-medium font-secondary text-secondary-text">
                No challenges match &ldquo;{searchQuery.trim()}&rdquo;
              </Text>
            </View>
          ) : (
            <View className="mt-10 items-center px-6">
              <Ionicons name="trophy-outline" size={28} color={colors.hint} />
              <Text className="mt-3 text-center text-body-medium font-secondary text-secondary-text">
                No challenges yet. Tap Create Challenge to start one.
              </Text>
            </View>
          )
        ) : (
          <View className="mt-4 gap-5">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </View>
        )}

        {/* ---- Completed challenges (collapsible) ---- */}
        {isHydrated && !loadError && filteredCompleted.length > 0 ? (
          <View className="mt-6">
            <Pressable
              onPress={() => setIsCompletedOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel={`${
                isCompletedOpen ? 'Collapse' : 'Expand'
              } completed challenges`}
              className="flex-row items-center justify-between rounded-md bg-surface p-4">
              <View className="flex-row items-center">
                <Text className="text-body-large font-secondary-semibold text-primary-text">
                  Completed Challenges
                </Text>
                <Text className="ml-2 text-body-small font-secondary text-secondary-text">
                  ({filteredCompleted.length})
                </Text>
              </View>
              <Ionicons
                name={isCompletedOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.secondaryText}
              />
            </Pressable>
            {isCompletedOpen ? (
              <View className="mt-3 gap-5">
                {filteredCompleted.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  const isPlaceholder = typeof value !== 'number';
  return (
    <View className="flex-1 rounded-md bg-surface px-5 py-4">
      <Text className="text-body-small font-secondary text-secondary-text">{label}</Text>
      <Text
        className={cn(
          'mt-1 text-headline-medium font-primary-bold',
          isPlaceholder ? 'text-secondary-text' : 'text-primary-text',
        )}>
        {value}
      </Text>
    </View>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const colors = useThemeColors();
  const router = useNavigationGuard();
  const topThree = challenge.leaderboard.slice(0, 3);
  const hasCover = !!challenge.coverImageUri;
  const hasEnded = !!challenge.endDate && challenge.endDate < todayISO();
  const daysText = hasEnded
    ? `Ended ${formatShortEndDate(challenge.endDate!)}`
    : challenge.status === 'joined' && challenge.startsInDays !== undefined
      ? `Starts in ${challenge.startsInDays} days`
      : `${challenge.daysRemaining} days remaining`;

  return (
    <Pressable
      onPress={() => router.push(`/challenges/${challenge.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${challenge.name}`}
      className="overflow-hidden rounded-md bg-surface"
      style={{ opacity: hasEnded ? 0.85 : 1 }}>
      {hasCover ? (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: challenge.coverImageUri }}
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.55)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}>
            <Text
              className="text-body-small font-secondary-semibold"
              style={{ color: '#FFFFFF' }}>
              {daysText}
            </Text>
          </View>
        </View>
      ) : null}
      <View className="p-5">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-title-large font-primary-bold text-primary-text">
            {challenge.name}
          </Text>
          {hasEnded ? (
            <View className="rounded-full bg-background px-3 py-1">
              <Text className="text-body-small font-secondary-semibold text-secondary-text">
                Completed
              </Text>
            </View>
          ) : (
            <StatusPill status={challenge.status} />
          )}
        </View>

        {hasCover ? null : (
          <Text className="mt-1 text-body-small font-secondary text-secondary-text">
            {daysText}
          </Text>
        )}

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-body-medium font-primary-bold text-primary-text">Group Progress</Text>
          <Text
            className="text-body-medium font-primary-bold"
            style={{ color: colors.primary }}>
            {challenge.progressPercent}%
          </Text>
        </View>
        <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-divider">
          <View
            className="h-full rounded-full"
            style={{ width: `${challenge.progressPercent}%`, backgroundColor: colors.primary }}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row">
            {topThree.map((entry, idx) =>
              entry.avatarUrl ? (
                <Image
                  key={entry.id}
                  source={{ uri: entry.avatarUrl }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: entry.avatarColor,
                    borderWidth: 2,
                    borderColor: colors.surface,
                    marginLeft: idx === 0 ? 0 : -8,
                  }}
                />
              ) : (
                <View
                  key={entry.id}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: entry.avatarColor,
                    borderWidth: 2,
                    borderColor: colors.surface,
                    marginLeft: idx === 0 ? 0 : -8,
                  }}
                />
              ),
            )}
          </View>
          <Text className="text-body-small font-secondary text-secondary-text">
            {challenge.participantCount}{' '}
            {challenge.participantCount === 1 ? 'participant' : 'participants'}
          </Text>
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

function formatShortEndDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
